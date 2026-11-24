export const BACKGROUND_PAUSE_EVENT = 'shellty:background-pause';

export function setBackgroundPaused(paused) {
    window.dispatchEvent(new CustomEvent(BACKGROUND_PAUSE_EVENT, { detail: paused }));
}
