import pl from '../locales/pl/translation.json';
import {
    markLeadSent,
    qualifierAnswers,
    qualifierSummary,
    saveQualifierAnswers,
    sentLead,
    summaryText,
} from './funnelContext';
import { updateLeadSession } from './leadSession';

function t(key) {
    return key.split('.').reduce((node, part) => node?.[part], pl) ?? key;
}

beforeEach(() => sessionStorage.clear());

describe('funnelContext', () => {
    it('describes qualifier answers in plain words', () => {
        const rows = qualifierSummary(t, { service: 'website', hasSite: 'yes_fix', timeline: 'asap' });
        expect(summaryText(rows)).toBe('Usługa: Nowa strona; Obecna strona: Tak, ale chcę ją poprawić; Termin: Jak najszybciej');
    });

    it('shares only answers that still fit the conversation', () => {
        saveQualifierAnswers({ service: 'it', hasSite: 'no', itNeed: 'server' });
        expect(qualifierAnswers()).toEqual({ service: 'it', itNeed: 'server' });
    });

    it('remembers a sent lead only while a note can still reach it', () => {
        const expiresIn = (minutes) => new Date(Date.now() + minutes * 60 * 1000).toISOString();
        expect(sentLead()).toBeNull();
        markLeadSent('Ola');
        updateLeadSession({ submissionSession: { token: 'lead-token', expiresAt: expiresIn(60) } });
        expect(sentLead()).toEqual({ name: 'Ola' });
        updateLeadSession({ submissionSession: { token: 'lead-token', expiresAt: expiresIn(-1) } });
        expect(sentLead()).toBeNull();
    });
});
