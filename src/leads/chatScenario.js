const PAGE_KEYS = { '/': 'home', '/services': 'services', '/portfolio': 'portfolio' };

export const CHAT_NODES = ['start', 'contact', 'contactEmergency', 'fallback', 'thanks', 'sent', 'noted', 'noteFailed'];

export function pageKey(pathname) {
    return PAGE_KEYS[pathname] ?? 'default';
}
