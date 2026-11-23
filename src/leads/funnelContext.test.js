import pl from '../locales/pl/translation.json';
import {
    chatService,
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
        expect(summaryText(rows)).toBe('Usługa: Nowa strona; Obecna strona: Tak, chcę ją poprawić; Termin: Jak najszybciej');
    });

    it('keeps the last non-empty qualifier answers', () => {
        saveQualifierAnswers({ service: 'it' });
        saveQualifierAnswers({});
        expect(qualifierAnswers()).toEqual({ service: 'it' });
    });

    it('remembers that a lead was already sent', () => {
        expect(sentLead()).toBeNull();
        markLeadSent('Ola');
        expect(sentLead()).toEqual({ name: 'Ola' });
    });

    it('shares only services the qualifier understands', () => {
        updateLeadSession({ chat: { service: 'app' } });
        expect(chatService()).toBe('app');
        updateLeadSession({ chat: { service: 'emergency' } });
        expect(chatService()).toBeNull();
    });
});
