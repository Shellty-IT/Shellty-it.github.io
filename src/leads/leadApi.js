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
let pendingSubmissionSession = null;

async function createSession() {
    if (!API_URL || !TURNSTILE_SITE_KEY) throw new LeadApiError(0, 'not_configured');
    const turnstileToken = await getTurnstileToken(TURNSTILE_SITE_KEY);
    const session = await post('/session', { turnstileToken });
    updateLeadSession({ apiSession: session });
    return session.token;
}

function savedSessionToken(key = 'apiSession') {
    const saved = loadLeadSession()[key];
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

function submissionToken() {
    const token = savedSessionToken('submissionSession');
    if (token) return Promise.resolve(token);
    pendingSubmissionSession ??= post('/lead/session', {}).then((session) => {
        updateLeadSession({ submissionSession: session });
        return session.token;
    }).finally(() => {
        pendingSubmissionSession = null;
    });
    return pendingSubmissionSession;
}

export async function submitLead(lead) {
    try {
        return await post('/lead', lead, await submissionToken());
    } catch (error) {
        if (!(error instanceof LeadApiError) || error.status !== 401) throw error;
        updateLeadSession({ submissionSession: null });
        return post('/lead', lead, await submissionToken());
    }
}

export function submitLeadNote(note) {
    if (loadLeadSession().leadSent?.emailReceipt) {
        return Promise.reject(new LeadApiError(404, 'lead_not_found'));
    }
    const token = savedSessionToken('submissionSession') ?? savedSessionToken();
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
