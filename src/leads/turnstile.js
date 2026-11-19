const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SCRIPT_TIMEOUT_MS = 10000;
const CHALLENGE_TIMEOUT_MS = 45000;

let scriptPromise = null;

function loadTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    scriptPromise ??= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const fail = () => {
            clearTimeout(timeout);
            scriptPromise = null;
            script.remove();
            reject(new Error('Turnstile script unavailable'));
        };
        const timeout = setTimeout(fail, SCRIPT_TIMEOUT_MS);
        script.src = SCRIPT_URL;
        script.async = true;
        script.onload = () => {
            if (!window.turnstile) {
                fail();
                return;
            }
            clearTimeout(timeout);
            resolve(window.turnstile);
        };
        script.onerror = fail;
        document.head.appendChild(script);
    });
    return scriptPromise;
}

export async function getTurnstileToken(siteKey) {
    const turnstile = await loadTurnstile();
    const container = document.createElement('div');
    container.className = 'lead-turnstile';
    document.body.appendChild(container);

    let widgetId;
    let timeout;
    try {
        return await new Promise((resolve, reject) => {
            const timedOut = () => reject(new Error('Turnstile challenge timed out'));
            timeout = setTimeout(timedOut, CHALLENGE_TIMEOUT_MS);
            widgetId = turnstile.render(container, {
                sitekey: siteKey,
                appearance: 'interaction-only',
                callback: resolve,
                'error-callback': () => reject(new Error('Turnstile challenge failed')),
                'timeout-callback': timedOut,
            });
        });
    } finally {
        clearTimeout(timeout);
        if (widgetId !== undefined) turnstile.remove(widgetId);
        container.remove();
    }
}
