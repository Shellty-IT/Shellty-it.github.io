import pl from '../locales/pl/translation.json';
import {
    markLeadSent,
    qualifierAnswers,
    qualifierSummary,
    saveQualifierAnswers,
    sentLead,
    summaryText,
} from './funnelContext';

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

    it('remembers that a lead was already sent', () => {
        expect(sentLead()).toBeNull();
        markLeadSent('Ola');
        expect(sentLead()).toEqual({ name: 'Ola' });
    });
});
