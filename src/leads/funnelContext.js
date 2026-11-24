import { relevantAnswers, summaryRows } from './qualifierEngine';
import { loadLeadSession, updateLeadSession } from './leadSession';

const MAX_CONTEXT = 1000;

export function qualifierAnswers() {
    return relevantAnswers(loadLeadSession().qualifier?.answers ?? {});
}

export function saveQualifierAnswers(answers) {
    updateLeadSession({ qualifier: { answers } });
}

export function clearQualifierAnswers() {
    updateLeadSession({ qualifier: null });
}

export function sentLead() {
    return loadLeadSession().leadSent ?? null;
}

export function markLeadSent(name) {
    updateLeadSession({ leadSent: { name } });
}

export function qualifierSummary(t, answers) {
    return summaryRows(answers).map(({ stepId, values }) => ({
        label: t(`qualifier.steps.${stepId}.summary`),
        value: values.map((value) => t(`qualifier.steps.${stepId}.options.${value}.label`)).join(', '),
    }));
}

export function summaryText(rows) {
    return rows.map(({ label, value }) => `${label}: ${value}`).join('; ').slice(0, MAX_CONTEXT);
}
