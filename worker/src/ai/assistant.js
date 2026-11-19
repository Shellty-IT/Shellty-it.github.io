import { isPlainObject } from '../http.js';
import { ACTIONS, PROJECT_IDS, PROJECT_TITLES, SERVICES, buildSystemPrompt } from './prompt.js';

const PROVIDER_DEFAULTS = {
    groq: {
        baseUrl: 'https://api.groq.com/openai/v1',
        keyVar: 'GROQ_API_KEY',
        modelVar: 'GROQ_MODEL',
        urlVar: 'GROQ_BASE_URL',
        reasoningVar: 'GROQ_REASONING_EFFORT',
    },
    gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        keyVar: 'GEMINI_API_KEY',
        modelVar: 'GEMINI_MODEL',
        urlVar: 'GEMINI_BASE_URL',
        reasoningVar: 'GEMINI_REASONING_EFFORT',
    },
};

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_TOKENS = 800;
const CIRCUIT_OPEN_MS = 60 * 1000;
const MAX_REPLY = 600;
const MAX_QUICK_REPLIES = 3;
const MAX_QUICK_REPLY = 40;

const PRICE_PATTERN = /\d[\d\s.,]*\s*(zł|zl\b|pln|złotych|eur\b|euro|usd|dolar)|[$€£]\s*\d/i;
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const PHONE_PATTERN = /(?:\+|00)?\d[\d\s().-]{7,}\d/g;

const LONG_DASH_PATTERN = /[\u2013\u2014]/g;
const PROJECT_ID_PATTERN = new RegExp(`\\b(${PROJECT_IDS.join('|')})\\b`, 'g');
const GENDERED_FORMS = [
    [/(?<!\p{L})chciała?by(?:ś|s)(?!\p{L})/giu, 'chcesz'],
    [/(?<!\p{L})(?:mógłby|mogłaby)(?:ś|s)(?!\p{L})/giu, 'możesz'],
];

const openCircuits = new Map();

export function normalizeReplyText(text) {
    let normalized = text.replace(LONG_DASH_PATTERN, '-').replace(PROJECT_ID_PATTERN, (id) => PROJECT_TITLES[id]);
    for (const [pattern, neutral] of GENDERED_FORMS) {
        normalized = normalized.replace(pattern, (match) => (match[0] === match[0].toUpperCase() ? neutral[0].toUpperCase() + neutral.slice(1) : neutral));
    }
    return normalized;
}

export class ProviderError extends Error {
    constructor(kind, detail) {
        super(`${kind}${detail ? `: ${detail}` : ''}`);
        this.kind = kind;
    }
}

export function resetCircuits() {
    openCircuits.clear();
}

export function maskContactData(text) {
    return text
        .replace(EMAIL_PATTERN, '[email]')
        .replace(PHONE_PATTERN, (match) => (match.replace(/\D/g, '').length >= 9 ? '[telefon]' : match));
}

export function configuredProviders(env) {
    return (env.PROVIDERS ?? '')
        .split(',')
        .map((name) => name.trim())
        .filter((name) => PROVIDER_DEFAULTS[name])
        .map((name) => {
            const defaults = PROVIDER_DEFAULTS[name];
            return {
                name,
                baseUrl: env[defaults.urlVar] || defaults.baseUrl,
                apiKey: env[defaults.keyVar],
                model: env[defaults.modelVar],
                reasoningEffort: env[defaults.reasoningVar] || null,
            };
        })
        .filter((provider) => provider.apiKey && provider.model);
}

function parseJsonContent(content) {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start < 0 || end <= start) throw new ProviderError('bad_response', 'no JSON object');
    try {
        return JSON.parse(content.slice(start, end + 1));
    } catch {
        throw new ProviderError('bad_response', 'invalid JSON');
    }
}

function validAction(action) {
    if (action === undefined) return 'none';
    if (ACTIONS.includes(action)) return action;
    const projectId = /^show_project:(\w+)$/.exec(action ?? '')?.[1];
    return projectId && PROJECT_IDS.includes(projectId) ? action : null;
}

export function parseAssistantReply(content) {
    const data = parseJsonContent(content);
    if (!isPlainObject(data)) throw new ProviderError('bad_response', 'not an object');

    const reply = typeof data.reply === 'string' ? data.reply.trim() : '';
    if (!reply || reply.length > MAX_REPLY) throw new ProviderError('bad_response', 'reply missing or too long');
    if (PRICE_PATTERN.test(reply)) throw new ProviderError('bad_response', 'reply mentions a price');

    const quickReplies = Array.isArray(data.quickReplies)
        ? data.quickReplies
            .filter((item) => typeof item === 'string' && item.trim() && item.length <= MAX_QUICK_REPLY)
            .filter((item) => !PRICE_PATTERN.test(item))
            .map((item) => normalizeReplyText(item.trim()))
            .slice(0, MAX_QUICK_REPLIES)
        : [];

    const action = validAction(data.action);
    if (action === null) throw new ProviderError('bad_response', 'action not allowed');

    const service = data.signals?.service;
    return {
        reply: normalizeReplyText(reply),
        quickReplies,
        action,
        signals: SERVICES.includes(service) ? { service } : {},
    };
}

async function callProvider(provider, messages, { fetchImpl, timeoutMs, maxTokens }) {
    let response;
    try {
        response = await fetchImpl(`${provider.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${provider.apiKey}`,
            },
            body: JSON.stringify({
                model: provider.model,
                messages,
                temperature: 0.4,
                max_tokens: maxTokens,
                response_format: { type: 'json_object' },
                ...(provider.reasoningEffort && { reasoning_effort: provider.reasoningEffort }),
            }),
            signal: AbortSignal.timeout(timeoutMs),
        });
    } catch (error) {
        const kind = error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'timeout' : 'network';
        throw new ProviderError(kind, error?.message);
    }

    if (response.status === 429) throw new ProviderError('rate_limited');
    if (response.status >= 500) throw new ProviderError('server', `HTTP ${response.status}`);
    if (!response.ok) throw new ProviderError('client', `HTTP ${response.status}`);

    const body = await response.json().catch(() => null);
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new ProviderError('bad_response', 'no message content');
    return parseAssistantReply(content);
}

export async function runAssistant(env, { history, lang, page, context }, { fetchImpl = fetch, now = Date.now } = {}) {
    const messages = [
        { role: 'system', content: buildSystemPrompt({ lang, page, context: context ? maskContactData(context) : '' }) },
        ...history.map(({ role, content }) => {
            const masked = maskContactData(content);
            return { role, content: role === 'assistant' ? JSON.stringify({ reply: masked }) : masked };
        }),
    ];
    const options = {
        fetchImpl,
        timeoutMs: Number(env.AI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
        maxTokens: Number(env.AI_MAX_TOKENS) || DEFAULT_MAX_TOKENS,
    };
    const attempts = [];

    for (const provider of configuredProviders(env)) {
        if ((openCircuits.get(provider.name) ?? 0) > now()) {
            attempts.push({ provider: provider.name, outcome: 'skipped' });
            continue;
        }
        const startedAt = now();
        try {
            const result = await callProvider(provider, messages, options);
            attempts.push({ provider: provider.name, outcome: 'ok', ms: now() - startedAt });
            return { ...result, provider: provider.name, attempts };
        } catch (error) {
            if (!(error instanceof ProviderError)) throw error;
            if (error.kind === 'rate_limited') openCircuits.set(provider.name, now() + CIRCUIT_OPEN_MS);
            attempts.push({ provider: provider.name, outcome: error.kind, ms: now() - startedAt });
        }
    }
    return { fallback: true, attempts };
}
