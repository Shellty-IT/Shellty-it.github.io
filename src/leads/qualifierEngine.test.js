import pl from '../locales/pl/translation.json';
import en from '../locales/en/translation.json';
import {
    ANSWER_BENEFITS,
    ASK_QUESTION,
    FIRST_STEP,
    INDUSTRY_BENEFITS,
    PATH_BENEFITS,
    QUESTION_STEPS,
} from './qualifierConfig';
import {
    MAX_BENEFITS,
    buildDiagnosis,
    isQuestionStep,
    nextStep,
    progress,
    questionPath,
    relevantAnswers,
    stepOptions,
} from './qualifierEngine';

const LOCALES = { pl, en };

function choicesFor(stepId) {
    return stepOptions(stepId).map(({ id }) => (QUESTION_STEPS[stepId].multiple ? [id] : id));
}

function allJourneys() {
    const journeys = [];
    const walk = (stepId, history, answers) => {
        if (!isQuestionStep(stepId)) {
            journeys.push({ end: stepId, history, answers });
            return;
        }
        const choices = [...choicesFor(stepId)];
        if (QUESTION_STEPS[stepId].urgentOption) choices.push(QUESTION_STEPS[stepId].urgentOption.id);
        for (const value of choices) {
            const nextAnswers = { ...answers, [stepId]: value };
            const next = nextStep(stepId, nextAnswers);
            walk(next, [...history, stepId], nextAnswers);
        }
    };
    walk(FIRST_STEP, [], {});
    return journeys;
}

function walkChoices(choices) {
    let stepId = FIRST_STEP;
    const history = [stepId];
    const answers = {};
    for (const value of choices) {
        answers[stepId] = value;
        stepId = nextStep(stepId, answers);
        history.push(stepId);
    }
    return { history, answers, stepId };
}

const journeys = allJourneys();
const diagnosisJourneys = journeys.filter(({ end }) => end === 'diagnosis');

describe('qualifier paths', () => {
    it('ends every journey at the diagnosis, the emergency contact or the question shortcut', () => {
        const ends = new Set(journeys.map(({ end }) => end));
        expect([...ends].sort()).toEqual([ASK_QUESTION, 'diagnosis', 'emergency'].sort());
    });

    it.each([
        ['website, first site', ['website', 'gastro', 'no', ['booking'], 'asap'], 'A'],
        ['website, new site', ['website', 'solo', 'yes_new', ['outdated'], 'month'], 'A'],
        ['website to improve', ['website', 'retail', 'yes_fix', 'wordpress', 'speed', 'quarter'], 'C'],
        ['business app', ['app', 'b2b', 'invoices', 'spec', 'asap'], 'B'],
        ['fixes', ['fixes', 'other', 'webapp', 'broken', 'asap'], 'C'],
        ['IT support', ['it', 'local', 'ongoing', ['no_backup'], 'month'], 'D'],
        ['unsure, more clients', ['unsure', 'more_clients', 'construction', 'no', ['more_leads'], 'quarter'], 'A'],
        ['unsure, saving time', ['unsure', 'save_time', 'other', 'excel', 'idea', 'browsing'], 'B'],
    ])('reaches the diagnosis for %s', (_label, choices, path) => {
        const { stepId, answers } = walkChoices(choices);
        expect(stepId).toBe('diagnosis');
        expect(buildDiagnosis(answers).path).toBe(path);
    });

    it('skips all questions for an emergency', () => {
        expect(walkChoices(['emergency']).stepId).toBe('emergency');
    });

    it('sends people who prefer to talk to the question shortcut', () => {
        expect(walkChoices(['unsure', 'talk']).stepId).toBe(ASK_QUESTION);
    });

    it('asks every visitor about the timeline last', () => {
        expect(diagnosisJourneys.filter(({ history }) => history.at(-1) !== 'timeline')).toEqual([]);
    });

    it('keeps every path short: 5 questions for a named service, at most 7 otherwise', () => {
        const lengths = (service) => diagnosisJourneys
            .filter(({ answers }) => answers.service === service)
            .map(({ history }) => history.length);
        for (const service of ['app', 'fixes', 'it']) expect(Math.max(...lengths(service))).toBe(5);
        expect(Math.min(...lengths('website'))).toBe(5);
        expect(Math.max(...diagnosisJourneys.map(({ history }) => history.length))).toBeLessThanOrEqual(7);
    });
});

describe('progress', () => {
    it('counts the current question and the expected path length', () => {
        expect(progress([FIRST_STEP], {})).toEqual({ current: 1, total: 5 });
        const { history, answers } = walkChoices(['website', 'gastro']);
        expect(progress(history, answers)).toEqual({ current: 3, total: 5 });
    });

    it('updates the total when an answer switches to a longer path', () => {
        const { history, answers } = walkChoices(['website', 'gastro', 'yes_fix']);
        expect(progress(history, answers)).toEqual({ current: 4, total: 6 });
    });

    it('is hidden outside of questions', () => {
        const { history, answers } = walkChoices(['fixes', 'other', 'webapp', 'broken', 'asap']);
        expect(progress(history, answers)).toBeNull();
    });
});

describe('relevantAnswers', () => {
    it('keeps answers of the current path and drops answers left behind after going back', () => {
        const first = walkChoices(['website', 'gastro', 'no', ['booking']]);
        const backToService = first.history.slice(0, 1);
        const answers = { ...first.answers, service: 'it' };
        const history = [...backToService, 'industry', 'itNeed'];
        expect(relevantAnswers(history, answers)).toEqual({ service: 'it', industry: 'gastro' });
        expect(questionPath(relevantAnswers(history, answers))).toContain('itPains');
    });

    it('keeps the optional website address only with the step that asked for it', () => {
        const answers = { service: 'website', hasSite: 'yes_new', sitePains: ['slow'], siteUrl: 'firma.pl' };
        expect(relevantAnswers(['service', 'hasSite', 'sitePains'], answers).siteUrl).toBe('firma.pl');
        expect(relevantAnswers(['service', 'hasSite'], answers).siteUrl).toBeUndefined();
    });
});

describe('diagnosis', () => {
    it('shows one to three points without duplicates, the visitor\'s own answers first', () => {
        for (const { answers } of diagnosisJourneys) {
            const { benefits } = buildDiagnosis(answers);
            const fromAnswers = [...new Set(Object.entries(answers)
                .flatMap(([stepId, value]) => [].concat(value).map((item) => ANSWER_BENEFITS[`${stepId}:${item}`]))
                .filter(Boolean))];
            expect(benefits.length).toBeGreaterThan(0);
            expect(benefits.length).toBeLessThanOrEqual(MAX_BENEFITS);
            expect(new Set(benefits).size).toBe(benefits.length);
            expect(benefits.slice(0, fromAnswers.length)).toEqual(fromAnswers.slice(0, MAX_BENEFITS));
        }
    });

    it('marks people who are just looking around for the short diagnosis', () => {
        const { answers } = walkChoices(['it', 'other', 'server', ['security'], 'browsing']);
        expect(buildDiagnosis(answers).isShort).toBe(true);
    });
});

describe('translations', () => {
    const benefitKeys = new Set([
        ...Object.values(ANSWER_BENEFITS),
        ...Object.values(INDUSTRY_BENEFITS),
        ...Object.values(PATH_BENEFITS).flat(),
    ]);

    it.each(Object.keys(LOCALES))('has every step, option and benefit text in %s', (lang) => {
        const { qualifier } = LOCALES[lang];
        for (const stepId of Object.keys(QUESTION_STEPS)) {
            const step = qualifier.steps[stepId];
            expect(step.prompt).toBeTruthy();
            expect(step.summary).toBeTruthy();
            const options = [...stepOptions(stepId)];
            if (QUESTION_STEPS[stepId].urgentOption) options.push(QUESTION_STEPS[stepId].urgentOption);
            for (const { id } of options) expect(step.options[id]?.label).toBeTruthy();
        }
        for (const key of benefitKeys) expect(qualifier.benefits[key]).toBeTruthy();
    });

    it.each(Object.keys(LOCALES))('never mentions a price in %s', (lang) => {
        const text = JSON.stringify(LOCALES[lang].qualifier);
        expect(text).not.toMatch(/\d\s*(zł|pln|eur|usd)|[€$£]|\bod\s+\d|\bfrom\s+\d/i);
    });

    it.each(Object.keys(LOCALES))('uses no em dash in %s', (lang) => {
        expect(JSON.stringify(LOCALES[lang].qualifier)).not.toContain('—');
    });
});
