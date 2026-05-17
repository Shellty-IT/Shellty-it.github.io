import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

/**
 * Synchronicznie wykrywa język przed inicjalizacją i18n.
 * Kolejność: localStorage → navigator.language → 'pl' (fallback).
 */
function detectLang() {
    try {
        const stored = localStorage.getItem('i18nextLng');
        if (stored === 'pl' || stored === 'en') return stored;
    } catch {}
    return (navigator.language || 'pl').startsWith('en') ? 'en' : 'pl';
}

const initialLang = detectLang();

/**
 * Ładuje dynamicznie (webpack code-split) tylko wykryty język.
 * Drugi język pobierany jest na żądanie przy zmianie w Navbar.
 * Eksportowany Promise pozwala index.js zaczekać przed pierwszym renderem,
 * eliminując migotanie kluczy tłumaczeń.
 */
const i18nReady = import(`./locales/${initialLang}/translation.json`).then(
    (mod) =>
        i18n
            .use(LanguageDetector)
            .use(initReactI18next)
            .init({
                resources: { [initialLang]: { translation: mod.default ?? mod } },
                fallbackLng: 'pl',
                lng: initialLang,
                supportedLngs: ['pl', 'en'],
                interpolation: { escapeValue: false },
                detection: {
                    order: ['localStorage', 'navigator', 'htmlTag'],
                    caches: ['localStorage'],
                },
                react: { useSuspense: false },
            })
);

export { i18nReady };
export default i18n;
