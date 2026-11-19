const STORAGE_KEY = 'shellty.leadSession';

export function loadLeadSession() {
    try {
        const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
        return stored !== null && typeof stored === 'object' ? stored : {};
    } catch {
        return {};
    }
}

export function updateLeadSession(patch) {
    const next = { ...loadLeadSession(), ...patch };
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
    return next;
}
