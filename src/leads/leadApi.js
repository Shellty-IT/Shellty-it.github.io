import { loadLeadSession, updateLeadSession } from './leadSession';
import { getTurnstileToken } from './turnstile';

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
    if (!API_URL || !TURNSTILE_SITE_KEY) throw new LeadApiError(0, 'not_configured');
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
    const turnstileToken = await getTurnstileToken(TURNSTILE_SITE_KEY);
    const session = await post('/session', { turnstileToken });
    updateLeadSession({ apiSession: session });
    return session.token;
}

function sessionToken() {
    const saved = loadLeadSession().apiSession;
    if (saved && Date.parse(saved.expiresAt) - Date.now() > SESSION_REFRESH_MARGIN_MS) {
        return Promise.resolve(saved.token);
    }
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

export function submitLead(lead) {
    return postWithSession('/lead', lead);
}

export function submitLeadNote(note) {
    return postWithSession('/lead/note', { note });
}

export function sendEvent({ name, page, data }) {
    return postWithSession('/event', { name, page, data });
}

export function sendChatMessage({ messages, lang, page, context }) {
    return postWithSession('/chat', { messages, lang, page, ...(context && { context }) });
}
