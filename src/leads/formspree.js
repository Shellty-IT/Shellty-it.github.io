const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xnjbjvoz';

export function postFormspree(form) {
    return fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: form,
    });
}
