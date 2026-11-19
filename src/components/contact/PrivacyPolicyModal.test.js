import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import pl from '../../locales/pl/translation.json';
import en from '../../locales/en/translation.json';
import PrivacyPolicyModal from './PrivacyPolicyModal';

const LOCALES = { pl, en };

function renderPolicy(lang) {
    const i18n = i18next.createInstance();
    i18n.use(initReactI18next).init({
        lng: lang,
        resources: { [lang]: { translation: LOCALES[lang] } },
        interpolation: { escapeValue: false },
    });
    render(
        <I18nextProvider i18n={i18n}>
            <PrivacyPolicyModal onClose={jest.fn()} />
        </I18nextProvider>
    );
}

describe('PrivacyPolicyModal', () => {
    it.each(Object.keys(LOCALES))('renders every section in %s', (lang) => {
        renderPolicy(lang);
        for (const { title } of LOCALES[lang].privacyPolicy.sections) {
            expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
        }
        expect(screen.getAllByRole('link', { name: 'kontakt@shellty.pl' })).toHaveLength(2);
        expect(screen.queryByText(/zohomail/)).not.toBeInTheDocument();
    });

    it.each(Object.keys(LOCALES))('describes the real data flow of the lead funnel in %s', (lang) => {
        const text = JSON.stringify(LOCALES[lang].privacyPolicy);
        for (const provider of ['Resend', 'Cloudflare', 'Turnstile', 'Groq', 'Gemini']) {
            expect(text).toContain(provider);
        }
        expect(text).toMatch(/12 (miesięcy|months)/);
        expect(text).not.toContain('Google Analytics');
        expect(text).not.toContain('—');
    });
});
