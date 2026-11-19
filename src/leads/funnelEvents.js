import { sendEvent } from './leadApi';

export function trackEvent(name, data = {}) {
    if (!process.env.REACT_APP_LEAD_API_URL) return;
    sendEvent({ name, page: window.location.pathname, data }).catch(() => {});
}
