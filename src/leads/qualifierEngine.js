import {
    ANSWER_BENEFITS,
    FIRST_STEP,
    INDUSTRY_BENEFITS,
    PATH_BENEFITS,
    QUESTION_STEPS,
    resolvePath,
} from './qualifierConfig';

export const INITIAL_STATE = { history: [FIRST_STEP], answers: {} };
export const MAX_BENEFITS = 3;

export function isQuestionStep(stepId) {
    return Object.prototype.hasOwnProperty.call(QUESTION_STEPS, stepId);
}

export function stepOptions(stepId) {
    return QUESTION_STEPS[stepId].options.map((option) =>
        typeof option === 'string' ? { id: option } : option
    );
}

export function nextStep(stepId, answers) {
    return QUESTION_STEPS[stepId].next(answers[stepId], answers);
}

export function relevantAnswers(history, answers) {
    const result = {};
    for (const stepId of history) {
        if (!isQuestionStep(stepId) || answers[stepId] === undefined) continue;
        result[stepId] = answers[stepId];
        if (QUESTION_STEPS[stepId].withSiteUrl && answers.siteUrl) result.siteUrl = answers.siteUrl;
    }
    return result;
}

export function questionPath(answers) {
    const path = [];
    let stepId = FIRST_STEP;
    while (isQuestionStep(stepId)) {
        path.push(stepId);
        stepId = nextStep(stepId, answers);
    }
    return path;
}

export function progress(history, answers) {
    const stepId = history[history.length - 1];
    if (!isQuestionStep(stepId)) return null;
    return {
        current: history.filter(isQuestionStep).length,
        total: questionPath(relevantAnswers(history, answers)).length,
    };
}

function answerEntries(answers) {
    return Object.entries(answers).flatMap(([stepId, value]) =>
        [].concat(value).map((item) => `${stepId}:${item}`)
    );
}

export function buildDiagnosis(answers) {
    const path = resolvePath(answers);
    const benefits = [
        ...answerEntries(answers).map((entry) => ANSWER_BENEFITS[entry]).filter(Boolean),
        ...(path === 'A' && INDUSTRY_BENEFITS[answers.industry] ? [INDUSTRY_BENEFITS[answers.industry]] : []),
        ...PATH_BENEFITS[path],
    ];
    return {
        path,
        benefits: [...new Set(benefits)].slice(0, MAX_BENEFITS),
        isShort: answers.timeline === 'browsing',
    };
}

export function summaryRows(answers) {
    return Object.entries(answers)
        .filter(([stepId]) => isQuestionStep(stepId))
        .map(([stepId, value]) => ({ stepId, values: [].concat(value) }));
}

export function resolveFollowUp(path, variant) {
    if (variant === 'emergency') return null;
    return path === 'A' ? 'assets' : 'other';
}
