import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import pl from '../../locales/pl/translation.json';
import QualifierModal from './QualifierModal';
import { submitLead, submitLeadNote } from '../../leads/leadApi';
import { loadLeadSession, updateLeadSession } from '../../leads/leadSession';

jest.mock('react-router-dom', () => {
    const { TextDecoder, TextEncoder } = require('util');
    Object.assign(global, { TextDecoder, TextEncoder });
    return jest.requireActual('react-router');
}, { virtual: true });

jest.mock('../../leads/leadApi', () => ({
    ...jest.requireActual('../../leads/leadApi'),
    submitLead: jest.fn(),
    submitLeadNote: jest.fn(),
}));

const i18n = i18next.createInstance();
i18n.use(initReactI18next).init({
    lng: 'pl',
    resources: { pl: { translation: pl } },
    interpolation: { escapeValue: false },
});

const { qualifier } = pl;
const { steps } = qualifier;

function renderModal(onClose = jest.fn()) {
    render(
        <I18nextProvider i18n={i18n}>
            <MemoryRouter initialEntries={['/services']}>
                <QualifierModal onClose={onClose} />
            </MemoryRouter>
        </I18nextProvider>
    );
}

async function choose(stepId, option) {
    fireEvent.click(await screen.findByRole('button', { name: steps[stepId].options[option].label }));
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: qualifier.phone.submit }));

beforeEach(() => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    sessionStorage.clear();
    submitLead.mockReset().mockResolvedValue({ ok: true });
    submitLeadNote.mockReset().mockResolvedValue({ ok: true });
});

describe('QualifierModal', () => {
    it('leads from three clicks to a phone number only', async () => {
        const close = jest.fn();
        renderModal(close);
        expect(screen.getByText(steps.service.prompt)).toBeVisible();
        expect(screen.queryByRole('textbox')).toBeNull();

        await choose('service', 'website');
        expect(await screen.findByText(steps.service.options.website.reaction)).toBeVisible();
        await choose('hasSite', 'no');
        await choose('timeline', 'asap');

        expect(await screen.findByText(qualifier.phone.prompt.contact)).toBeVisible();
        const phone = screen.getByLabelText(qualifier.contact.fields.phone);
        expect(phone).toHaveFocus();
        expect(screen.queryByRole('checkbox')).toBeNull();
        expect(screen.getAllByRole('textbox')).toHaveLength(1);

        submit();
        expect(screen.getByText(qualifier.contact.errors.phone)).toBeVisible();
        expect(submitLead).not.toHaveBeenCalled();

        fireEvent.change(phone, { target: { value: '600 700 800' } });
        submit();
        expect(await screen.findByText(qualifier.thanks.text.contact)).toBeVisible();
        expect(submitLead).toHaveBeenCalledWith({
            phone: '600700800',
            email: '',
            name: '',
            consent: true,
            consentText: `${qualifier.phone.notice} ${qualifier.contact.privacyLink}.`,
            fax: '',
            source: 'qualifier',
            page: '/services',
            lang: 'pl',
            answers: { service: 'website', hasSite: 'no', timeline: 'asap' },
        });
        expect(screen.getByText('+48 600 700 800')).toBeVisible();

        fireEvent.click(screen.getAllByRole('button', { name: qualifier.thanks.close }).at(-1));
        expect(close).toHaveBeenCalledWith({ savedMidway: false });
    });

    it('skips the questions and the email option for an emergency', async () => {
        renderModal();
        await choose('service', 'emergency');
        expect(await screen.findByText(qualifier.phone.prompt.emergency)).toBeVisible();
        expect(screen.queryByRole('button', { name: qualifier.phone.useEmail })).toBeNull();
    });

    it('lets the visitor leave an email instead and shows send errors', async () => {
        submitLead.mockRejectedValueOnce(new Error('offline'));
        renderModal();
        await choose('service', 'unsure');
        await choose('timeline', 'browsing');
        fireEvent.click(await screen.findByRole('button', { name: qualifier.phone.useEmail }));
        const email = screen.getByLabelText(qualifier.contact.fields.email);
        fireEvent.change(email, { target: { value: 'jan@example.org' } });
        submit();
        expect(await screen.findByText(qualifier.contact.errors.network)).toBeVisible();
        submit();
        expect(await screen.findByText(qualifier.thanks.text.contact)).toBeVisible();
        expect(submitLead).toHaveBeenLastCalledWith(expect.objectContaining({
            phone: '',
            email: 'jan@example.org',
            answers: { service: 'unsure', timeline: 'browsing' },
        }));
    });

    it('resumes saved answers and lets the visitor go back', async () => {
        const close = jest.fn();
        renderModal(close);
        await choose('service', 'app');
        await screen.findByText(steps.appStage.prompt);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(close).toHaveBeenCalledWith({ savedMidway: true });
        cleanup();

        renderModal();
        expect(screen.getByText(steps.appStage.prompt)).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: qualifier.back }));
        await choose('service', 'fixes');
        await screen.findByText(steps.fixTarget.prompt);
        expect(loadLeadSession().qualifierAnswers).toEqual({ service: 'fixes' });
    });

    it('adds the answers to a lead sent earlier instead of asking for the number again', async () => {
        updateLeadSession({ leadSent: { name: '' } });
        submitLeadNote.mockRejectedValueOnce(new Error('offline'));
        renderModal();
        await choose('service', 'emergency');
        expect(await screen.findByText(qualifier.phone.prompt.noted)).toBeVisible();
        expect(screen.queryByLabelText(qualifier.contact.fields.phone)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: qualifier.thanks.sendNote }));
        expect(await screen.findByText(qualifier.contact.errors.network)).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: qualifier.thanks.sendNote }));
        expect(await screen.findByText(qualifier.thanks.text.noted)).toBeVisible();
        expect(submitLeadNote).toHaveBeenLastCalledWith(`${qualifier.noteIntro} Usługa: ${steps.service.options.emergency.label}`);
        expect(submitLead).not.toHaveBeenCalled();
    });
});
