import { CONTACT_STEP, FIRST_STEP, QUESTION_STEPS } from './qualifierConfig';

export function isQuestionStep(stepId) {
    return Object.prototype.hasOwnProperty.call(QUESTION_STEPS, stepId);
}

function isAnswered(stepId, answers) {
    return QUESTION_STEPS[stepId].options.some(({ id }) => id === answers[stepId]);
}

export function conversationSteps(answers) {
    const steps = [];
    let stepId = FIRST_STEP;
    while (stepId !== CONTACT_STEP) {
        steps.push(stepId);
        if (!isAnswered(stepId, answers)) return steps;
        stepId = QUESTION_STEPS[stepId].next(answers[stepId]);
    }
    return [...steps, CONTACT_STEP];
}

export function relevantAnswers(answers) {
    return Object.fromEntries(
        conversationSteps(answers)
            .filter((stepId) => isQuestionStep(stepId) && isAnswered(stepId, answers))
            .map((stepId) => [stepId, answers[stepId]])
    );
}

export function summaryRows(answers) {
    return Object.entries(answers)
        .filter(([stepId]) => isQuestionStep(stepId))
        .map(([stepId, value]) => ({ stepId, values: [].concat(value) }));
}
