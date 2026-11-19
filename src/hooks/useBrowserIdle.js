import { useEffect, useState } from 'react';

const IDLE_TIMEOUT_MS = 3000;
const FALLBACK_DELAY_MS = 1500;

export default function useBrowserIdle() {
    const [idle, setIdle] = useState(false);

    useEffect(() => {
        if ('requestIdleCallback' in window) {
            const id = window.requestIdleCallback(() => setIdle(true), { timeout: IDLE_TIMEOUT_MS });
            return () => window.cancelIdleCallback(id);
        }
        const timer = setTimeout(() => setIdle(true), FALLBACK_DELAY_MS);
        return () => clearTimeout(timer);
    }, []);

    return idle;
}
