import { summaryRows } from './qualifierEngine';
import { loadLeadSession, updateLeadSession } from './leadSession';

export const SHARED_SERVICES = ['website', 'app', 'fixes', 'it'];
const MAX_CONTEXT = 1000;

export function qualifierAnswers() {
    return loadLeadSession().qualifierAnswers ?? {};
}

export function saveQualifierAnswers(answers) {
    if (Object.keys(answers).length > 0) updateLeadSession({ qualifierAnswers: answers });
}

export function sentLead() {
    return loadLeadSession().leadSent ?? null;
}

export function markLeadSent(name) {
    updateLeadSession({ leadSent: { name } });
}

export function chatService() {
    const service = loadLeadSession().chat?.service;
    return SHARED_SERVICES.includes(service) ? service : null;
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
