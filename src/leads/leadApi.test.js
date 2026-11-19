import { loadLeadSession, updateLeadSession } from './leadSession';
import { markLeadSent } from './funnelContext';
import { getTurnstileToken } from './turnstile';

jest.mock('./turnstile', () => ({ getTurnstileToken: jest.fn() }));

const WORKER = 'https://worker.test';
const FORMSPREE = 'https://formspree.io/f/xnjbjvoz';
const lead = {
    name: 'Test',
    email: 'test@example.com',
    source: 'qualifier',
    answers: { service: 'website' },
    consentText: 'Zgoda testowa',
};

const result = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data });
let api;
const originalFetch = global.fetch;
const originalEnvironment = process.env;
const originalCrypto = global.crypto;

beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
    global.fetch = jest.fn();
    global.crypto = { randomUUID: () => 'lead-reference' };
    process.env = { ...originalEnvironment, REACT_APP_LEAD_API_URL: WORKER, REACT_APP_TURNSTILE_SITEKEY: 'test' };
    jest.isolateModules(() => { api = require('./leadApi'); });
});

afterEach(() => {
    global.fetch = originalFetch;
    global.crypto = originalCrypto;
    process.env = originalEnvironment;
});

function saveSession() {
    updateLeadSession({ apiSession: { token: 'signed', expiresAt: new Date(Date.now() + 600_000).toISOString() } });
}

it.each(['qualifier', 'chat'])('sends a %s lead and its follow-up to Formspree without starting Turnstile', async (source) => {
    global.fetch.mockResolvedValue(result(200, { ok: true }));
    await api.sendEvent({ name: 'chat_open' });
    expect(global.fetch).not.toHaveBeenCalled();

    const saved = await api.submitLead({ ...lead, source, chatSummary: 'Treść rozmowy' });
    markLeadSent(lead.name, saved.emailReceipt);
    await api.submitLeadNote('Dopisek testowy');

    expect(getTurnstileToken).not.toHaveBeenCalled();
    const [submission, followUp] = global.fetch.mock.calls;
    expect(submission[0]).toBe(FORMSPREE);
    expect(submission[1].body.get('email')).toBe(lead.email);
    expect(submission[1].body.get('message')).toContain('Nowa strona internetowa');
    expect(submission[1].body.get('message')).toContain('Treść rozmowy');
    expect(followUp[0]).toBe(FORMSPREE);
    expect(followUp[1].body.get('message')).toContain('lead-reference');
    expect(followUp[1].body.get('message')).toContain('Dopisek testowy');
});

it('keeps using the Worker with an existing session and switches only when that session is rejected', async () => {
    saveSession();
    global.fetch.mockResolvedValueOnce(result(201, { ok: true }));
    expect(await api.submitLead(lead)).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe(`${WORKER}/lead`);

    global.fetch.mockResolvedValueOnce(result(401, { error: 'invalid_session' }));
    global.fetch.mockResolvedValueOnce(result(200, { ok: true }));
    expect((await api.submitLead(lead)).emailReceipt.reference).toBe('lead-reference');
    expect(global.fetch.mock.calls[2][0]).toBe(FORMSPREE);
    expect(loadLeadSession().apiSession).toBeNull();
    expect(getTurnstileToken).not.toHaveBeenCalled();
});

it('reports provider failures and avoids a second submission after an ambiguous Worker failure', async () => {
    global.fetch.mockResolvedValueOnce(result(200, { ok: false }));
    await expect(api.submitLead(lead)).rejects.toMatchObject({ code: 'formspree_failed' });

    saveSession();
    global.fetch.mockRejectedValueOnce(new TypeError('Connection closed'));
    await expect(api.submitLead(lead)).rejects.toThrow('Connection closed');
    expect(global.fetch).toHaveBeenCalledTimes(2);
});

it('continues to authenticate AI chat sessions through Turnstile', async () => {
    getTurnstileToken.mockResolvedValue('challenge-token');
    global.fetch.mockResolvedValueOnce(result(200, { token: 'signed', expiresAt: new Date(Date.now() + 600_000).toISOString() }));
    global.fetch.mockResolvedValueOnce(result(200, { reply: 'Odpowiedź' }));

    const data = await api.sendChatMessage({ messages: [{ role: 'user', content: 'Pytanie' }], lang: 'pl', page: '/', context: 'Odpowiedzi formularza' });
    expect(data.reply).toBe('Odpowiedź');
    expect(getTurnstileToken).toHaveBeenCalledWith('test');
    expect(global.fetch.mock.calls[0][0]).toBe(`${WORKER}/session`);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ turnstileToken: 'challenge-token' });
    expect(global.fetch.mock.calls[1][0]).toBe(`${WORKER}/chat`);
    expect(JSON.parse(global.fetch.mock.calls[1][1].body).context).toBe('Odpowiedzi formularza');
});
