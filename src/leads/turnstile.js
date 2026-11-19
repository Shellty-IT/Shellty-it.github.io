const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise = null;

function loadTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    scriptPromise ??= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SCRIPT_URL;
        script.async = true;
        script.onload = () => resolve(window.turnstile);
        script.onerror = () => {
            scriptPromise = null;
            script.remove();
            reject(new Error('Turnstile script failed to load'));
        };
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
    try {
        return await new Promise((resolve, reject) => {
            widgetId = turnstile.render(container, {
                sitekey: siteKey,
                appearance: 'interaction-only',
                callback: resolve,
                'error-callback': () => reject(new Error('Turnstile challenge failed')),
                'timeout-callback': () => reject(new Error('Turnstile challenge timed out')),
            });
        });
    } finally {
        if (widgetId !== undefined) turnstile.remove(widgetId);
        container.remove();
    }
}
