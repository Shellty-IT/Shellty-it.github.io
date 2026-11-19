import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter, useLocation } from 'react-router-dom';
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

function LocationProbe() {
    return <span data-testid="location">{useLocation().pathname}</span>;
}

function renderModal(onClose = jest.fn(), onAskQuestion = jest.fn()) {
    render(
        <I18nextProvider i18n={i18n}>
            <MemoryRouter initialEntries={['/services']}>
                <QualifierModal onClose={onClose} onAskQuestion={onAskQuestion} />
                <LocationProbe />
            </MemoryRouter>
        </I18nextProvider>
    );
}

beforeEach(() => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    sessionStorage.clear();
    submitLead.mockReset().mockResolvedValue({ ok: true });
    submitLeadNote.mockReset().mockResolvedValue({ ok: true });
});

describe('QualifierModal', () => {
    const choose = (topic) => fireEvent.click(screen.getByRole('button', { name: qualifier.steps.service.options[topic].label }));
    const submit = () => fireEvent.click(screen.getByRole('button', { name: qualifier.contact.contact.submit }));

    it.each(Object.keys(qualifier.contact.topics))('opens contact immediately for %s', (topic) => {
        renderModal();
        expect(screen.getByRole('dialog')).toHaveAccessibleName(qualifier.steps.service.prompt);
        choose(topic);
        expect(screen.getByLabelText(qualifier.contact.topics[topic])).toBeVisible();
        expect(screen.getByLabelText('Telefon')).toBeVisible();
        expect(screen.queryByRole('button', { name: qualifier.contact.channels.email }) !== null).toBe(topic !== 'emergency');
    });

    it('validates contact and sends the topic with the edited description', async () => {
        renderModal();
        choose('website');
        submit();
        expect(screen.getByLabelText('Telefon')).toHaveFocus();
        expect(submitLead).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: qualifier.contact.channels.email }));
        fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'jan@example.org' } });
        fireEvent.change(screen.getByLabelText(qualifier.contact.topics.website), { target: { value: 'Rezerwacje online' } });
        fireEvent.click(screen.getByRole('checkbox'));
        submit();
        expect(await screen.findByText(qualifier.thanks.title_anonymous)).toBeVisible();
        expect(submitLead).toHaveBeenCalledWith(expect.objectContaining({
            source: 'qualifier', email: 'jan@example.org', consent: true,
            answers: { service: 'website', message: 'Rezerwacje online' },
        }));
        fireEvent.change(screen.getByLabelText(/Co już masz/), { target: { value: 'Mam domenę' } });
        fireEvent.click(screen.getByRole('button', { name: qualifier.thanks.sendNote }));
        expect(await screen.findByText(qualifier.thanks.noteSent)).toBeVisible();
    });

    it('resumes a saved topic and lets the visitor change it', () => {
        const close = jest.fn();
        renderModal(close);
        choose('app');
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(close).toHaveBeenCalledWith({ savedMidway: true });
        cleanup();
        renderModal();
        expect(screen.getByLabelText(qualifier.contact.topics.app)).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: qualifier.back }));
        choose('fixes');
        expect(loadLeadSession().qualifierAnswers).toEqual({ service: 'fixes' });
    });

    it('reuses the contact for a previously submitted lead and supports retry', async () => {
        updateLeadSession({ leadSent: { name: 'Ola' } });
        submitLeadNote.mockRejectedValueOnce(new Error('offline'));
        renderModal();
        choose('it');
        expect(screen.queryByLabelText('Telefon')).toBeNull();
        fireEvent.change(screen.getByLabelText(qualifier.contact.topics.it), { target: { value: 'Serwer' } });
        fireEvent.click(screen.getByRole('button', { name: qualifier.thanks.sendNote }));
        expect(await screen.findByText(qualifier.contact.errors.network)).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: qualifier.thanks.sendNote }));
        expect(await screen.findByText('Dzięki, Ola!')).toBeVisible();
        expect(submitLeadNote).toHaveBeenLastCalledWith('Wsparcie IT: Serwer');
        expect(submitLead).not.toHaveBeenCalled();
    });
});
