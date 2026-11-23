import pl from '../locales/pl/translation.json';
import en from '../locales/en/translation.json';
import { CONTACT_STEP, QUESTION_STEPS } from './qualifierConfig';
import { conversationSteps, relevantAnswers } from './qualifierEngine';

const LOCALES = { pl, en };

describe('conversationSteps', () => {
    it.each([
        ['website', { service: 'website', hasSite: 'no', timeline: 'asap' }, ['service', 'hasSite', 'timeline']],
        ['app', { service: 'app', appStage: 'idea', timeline: 'month' }, ['service', 'appStage', 'timeline']],
        ['fixes', { service: 'fixes', fixTarget: 'wordpress', timeline: 'asap' }, ['service', 'fixTarget', 'timeline']],
        ['IT', { service: 'it', itNeed: 'server', timeline: 'browsing' }, ['service', 'itNeed', 'timeline']],
        ['unsure', { service: 'unsure', timeline: 'asap' }, ['service', 'timeline']],
        ['emergency', { service: 'emergency' }, ['service']],
    ])('asks at most three questions before the phone number for %s', (_label, answers, questions) => {
        expect(conversationSteps(answers)).toEqual([...questions, CONTACT_STEP]);
    });

    it('stops at the first unanswered or unknown answer', () => {
        expect(conversationSteps({})).toEqual(['service']);
        expect(conversationSteps({ service: 'website' })).toEqual(['service', 'hasSite']);
        expect(conversationSteps({ service: 'website', hasSite: 'maybe', timeline: 'asap' })).toEqual(['service', 'hasSite']);
    });
});

describe('relevantAnswers', () => {
    it('drops answers left behind after changing the service', () => {
        const answers = { service: 'it', hasSite: 'no', itNeed: 'server', timeline: 'asap' };
        expect(relevantAnswers(answers)).toEqual({ service: 'it', itNeed: 'server', timeline: 'asap' });
    });

    it('drops unknown values from an old saved session', () => {
        expect(relevantAnswers({ service: 'website', industry: 'gastro', hasSite: 'yes_fix', timeline: 'quarter' }))
            .toEqual({ service: 'website', hasSite: 'yes_fix' });
    });
});

describe('translations', () => {
    it.each(Object.keys(LOCALES))('has every step and option text in %s', (lang) => {
        const { qualifier } = LOCALES[lang];
        for (const [stepId, step] of Object.entries(QUESTION_STEPS)) {
            expect(qualifier.steps[stepId].prompt).toBeTruthy();
            expect(qualifier.steps[stepId].summary).toBeTruthy();
            for (const { id } of step.options) expect(qualifier.steps[stepId].options[id]?.label).toBeTruthy();
        }
    });

    it.each(Object.keys(LOCALES))('never mentions a price in %s', (lang) => {
        const text = JSON.stringify(LOCALES[lang].qualifier);
        expect(text).not.toMatch(/\d\s*(zł|pln|eur|usd)|[€$£]|\bod\s+\d|\bfrom\s+\d/i);
    });

    it.each(Object.keys(LOCALES))('uses no em dash in %s', (lang) => {
        expect(JSON.stringify(LOCALES[lang].qualifier)).not.toContain('—');
    });
});
