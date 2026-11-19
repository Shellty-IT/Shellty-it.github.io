import { trackEvent } from './funnelEvents';
import { sendEvent } from './leadApi';

jest.mock('./leadApi', () => ({ sendEvent: jest.fn() }));

const API_URL = process.env.REACT_APP_LEAD_API_URL;

afterEach(() => {
    process.env.REACT_APP_LEAD_API_URL = API_URL;
    sendEvent.mockReset();
});

describe('trackEvent', () => {
    it('sends the event with the current page', () => {
        process.env.REACT_APP_LEAD_API_URL = 'http://localhost:8787';
        sendEvent.mockResolvedValue({ ok: true });
        trackEvent('qualifier_step', { step: 'industry', index: 2 });
        expect(sendEvent).toHaveBeenCalledWith({ name: 'qualifier_step', page: '/', data: { step: 'industry', index: 2 } });
    });

    it('never breaks the page when the event cannot be sent', async () => {
        process.env.REACT_APP_LEAD_API_URL = 'http://localhost:8787';
        sendEvent.mockRejectedValue(new TypeError('Failed to fetch'));
        expect(() => trackEvent('chat_open')).not.toThrow();
        await Promise.resolve();
    });

    it('does nothing when the lead API is not configured', () => {
        delete process.env.REACT_APP_LEAD_API_URL;
        trackEvent('chat_open');
        expect(sendEvent).not.toHaveBeenCalled();
    });
});
