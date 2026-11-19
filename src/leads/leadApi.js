import { loadLeadSession, updateLeadSession } from './leadSession';
import { getTurnstileToken } from './turnstile';
import { postFormspree } from './formspree';

const API_URL = process.env.REACT_APP_LEAD_API_URL;
const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITEKEY;
const SESSION_REFRESH_MARGIN_MS = 60 * 1000;

export class LeadApiError extends Error {
    constructor(status, code) {
        super(code || `HTTP ${status}`);
        this.status = status;
        this.code = code;
    }
}

async function post(path, body, token) {
    if (!API_URL) throw new LeadApiError(0, 'not_configured');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new LeadApiError(response.status, data.error);
    return data;
}

let pendingSession = null;

async function createSession() {
    if (!API_URL || !TURNSTILE_SITE_KEY) throw new LeadApiError(0, 'not_configured');
    const turnstileToken = await getTurnstileToken(TURNSTILE_SITE_KEY);
    const session = await post('/session', { turnstileToken });
    updateLeadSession({ apiSession: session });
    return session.token;
}

function savedSessionToken() {
    const saved = loadLeadSession().apiSession;
    return saved && Date.parse(saved.expiresAt) - Date.now() > SESSION_REFRESH_MARGIN_MS ? saved.token : null;
}

function sessionToken() {
    const token = savedSessionToken();
    if (token) return Promise.resolve(token);
    pendingSession ??= createSession().finally(() => {
        pendingSession = null;
    });
    return pendingSession;
}

async function postWithSession(path, body) {
    try {
        return await post(path, body, await sessionToken());
    } catch (error) {
        if (!(error instanceof LeadApiError) || error.status !== 401) throw error;
        updateLeadSession({ apiSession: null });
        return post(path, body, await sessionToken());
    }
}

async function sendLeadEmail(lead, reference, note) {
    const { leadEmail } = await import('./leadEmail');
    const response = await postFormspree(leadEmail(lead, reference, note));
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok !== true) throw new LeadApiError(response.status, 'formspree_failed');
}

export async function submitLead(lead) {
    const token = savedSessionToken();
    if (API_URL && token) {
        try {
            return await post('/lead', lead, token);
        } catch (error) {
            if (!(error instanceof LeadApiError) || error.status !== 401) throw error;
            updateLeadSession({ apiSession: null });
        }
    }
    const reference = crypto.randomUUID();
    await sendLeadEmail(lead, reference);
    return { ok: true, emailReceipt: { reference, source: lead.source } };
}

export function submitLeadNote(note) {
    const lead = loadLeadSession().leadSent;
    if (lead?.emailReceipt) {
        const { source, reference } = lead.emailReceipt;
        return sendLeadEmail({ name: lead.name, source }, reference, note);
    }
    const token = savedSessionToken();
    if (!token) return Promise.reject(new LeadApiError(401, 'invalid_session'));
    return post('/lead/note', { note }, token);
}

export function sendEvent({ name, page, data }) {
    const token = savedSessionToken();
    return token ? post('/event', { name, page, data }, token) : Promise.resolve();
}

export function sendChatMessage({ messages, lang, page, context }) {
    return postWithSession('/chat', { messages, lang, page, ...(context && { context }) });
}
