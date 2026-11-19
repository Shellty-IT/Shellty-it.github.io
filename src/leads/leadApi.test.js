import { updateLeadSession } from './leadSession';
import { getTurnstileToken } from './turnstile';

jest.mock('./turnstile', () => ({ getTurnstileToken: jest.fn() }));

const WORKER = 'https://worker.test';

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


beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
    global.fetch = jest.fn();

    process.env = { ...originalEnvironment, REACT_APP_LEAD_API_URL: WORKER, REACT_APP_TURNSTILE_SITEKEY: 'test' };
    jest.isolateModules(() => { api = require('./leadApi'); });
});

afterEach(() => {
    global.fetch = originalFetch;

    process.env = originalEnvironment;
});

function saveSession() {
    updateLeadSession({ submissionSession: { token: 'signed', expiresAt: new Date(Date.now() + 600_000).toISOString() } });
}

it.each(['qualifier', 'chat', 'contact'])('sends a %s submission to the Worker', async (source) => {
    saveSession();
    global.fetch.mockResolvedValue(result(201, { ok: true }));
    const submission = { ...lead, source, message: 'Treść zgłoszenia' };
    await expect(api.submitLead(submission)).resolves.toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, request] = global.fetch.mock.calls[0];
    expect(url).toBe(WORKER + '/lead');
    expect(request.headers.Authorization).toBe('Bearer signed');
    expect(JSON.parse(request.body)).toEqual(submission);
});

it('rejects an unconfirmed submission instead of sending it through another provider', async () => {
    saveSession();
    global.fetch.mockRejectedValueOnce(new TypeError('Connection closed'));
    await expect(api.submitLead(lead)).rejects.toThrow('Connection closed');
    expect(global.fetch).toHaveBeenCalledTimes(1);
});

it('starts a dedicated submission session without running the assistant verification', async () => {
    global.fetch.mockResolvedValueOnce(result(200, { token: 'form', expiresAt: new Date(Date.now() + 600_000).toISOString() }));
    global.fetch.mockResolvedValueOnce(result(201, { ok: true }));
    await api.submitLead(lead);
    expect(getTurnstileToken).not.toHaveBeenCalled();
    expect(global.fetch.mock.calls.map(([url]) => url)).toEqual([WORKER + '/lead/session', WORKER + '/lead']);
    expect(global.fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer form');
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
