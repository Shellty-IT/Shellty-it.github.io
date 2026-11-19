import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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

const chat = () => within(screen.getByRole('log'));
const activeExchange = () => within(screen.getByRole('log').lastElementChild);
const reply = async (name, scope = activeExchange()) => {
    fireEvent.click(await scope.findByRole('button', { name: new RegExp(name) }));
};
const accept = (name = qualifier.diagnosis.yes) => reply(name, screen);

async function fillContact(name = 'Jan', phone = '512345678') {
    fireEvent.change(await screen.findByLabelText('Imię (opcjonalnie)'), { target: { value: name } });
    fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: phone } });
    fireEvent.click(screen.getByRole('checkbox'));
}

async function walkToDiagnosis() {
    await reply('Nowa strona internetowa');
    await reply('Gastronomia');
    await reply('Nie, to pierwsza');
    await reply('Rezerwacje lub zamówienia online');
    await reply('Dalej');
    await reply('Jak najszybciej');
    await activeExchange().findByText(qualifier.diagnosis.benefitsTitle);
}

beforeEach(() => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    sessionStorage.clear();
    submitLead.mockReset().mockResolvedValue({ ok: true });
    submitLeadNote.mockReset().mockResolvedValue({ ok: true });
});

describe('QualifierModal', () => {
    it('opens as a modal conversation with the first question, without changing the address', async () => {
        renderModal();
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
        expect(screen.getByRole('dialog')).toHaveAccessibleName(qualifier.chat.title);
        expect(await screen.findByText(qualifier.steps.service.prompt)).toHaveFocus();
        expect(screen.getByText('Krok 1 z 5')).toBeInTheDocument();
        expect(screen.getByTestId('location')).toHaveTextContent('/services');
    });

    it('keeps earlier prompts, replies and selected tiles in the conversation', async () => {
        renderModal();
        await reply('Nowa strona internetowa');
        await reply('Gastronomia');
        await screen.findByText(qualifier.steps.hasSite.prompt);

        expect(chat().getByText(qualifier.steps.industry.prompt)).toBeInTheDocument();
        expect(chat().getByRole('button', { name: /Gastronomia/ })).toHaveAttribute('aria-pressed', 'true');
        expect(chat().getByText(qualifier.steps.industry.options.gastro.reaction)).toBeInTheDocument();
        expect(chat().getByText('Gastronomia, hotel, turystyka', { selector: '.lq-bubble--user' })).toBeInTheDocument();

        const notes = within(screen.getByRole('list', { name: qualifier.rail.notesAria }));
        expect(notes.getByText('Nowa strona internetowa')).toBeInTheDocument();
        expect(notes.getByText('Gastronomia, hotel, turystyka')).toBeInTheDocument();
        expect(notes.getByRole('listitem', { current: 'step' })).toHaveTextContent(qualifier.steps.hasSite.summary);
    });

    it('counts the answers towards the plan', async () => {
        renderModal();
        expect(await screen.findByText('Jeszcze 5 pytań')).toBeInTheDocument();
        await reply('Nowa strona internetowa');
        expect(await screen.findByText('Jeszcze 4 pytania')).toBeInTheDocument();
        expect(screen.getByText('1/5')).toBeInTheDocument();
    });

    it('lets the visitor switch to the chat from any question', async () => {
        const onAskQuestion = jest.fn();
        renderModal(jest.fn(), onAskQuestion);
        fireEvent.click(await screen.findByRole('button', { name: qualifier.ownWords }));
        expect(onAskQuestion).toHaveBeenCalled();
    });

    it('shows a typing indicator before the next question', async () => {
        renderModal();
        await reply('Aplikacja dla firmy');
        expect(screen.getByRole('status')).toHaveTextContent(qualifier.chat.typing);
        expect(await screen.findByText(qualifier.steps.industry.prompt)).toBeInTheDocument();
    });

    it('ends with a short plan and the call to action outside the scrolled conversation', async () => {
        renderModal();
        await walkToDiagnosis();
        expect(screen.getByText(qualifier.benefits.booking)).toBeInTheDocument();
        expect(screen.getByText(qualifier.benefits.industryGastro)).toBeInTheDocument();
        expect(screen.queryByText('Tomi Forno')).toBeNull();
        expect(chat().queryByRole('figure')).toBeNull();
        expect(activeExchange().queryByRole('button')).toBeNull();
        expect(screen.getByRole('button', { name: qualifier.diagnosis.yes })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: qualifier.diagnosis.question })).toBeInTheDocument();
        expect(screen.getByText(qualifier.plan.ready)).toBeInTheDocument();
        expect(screen.getByRole('dialog').textContent).not.toMatch(/zł|PLN/);
    });

    it('keeps earlier answers when going back', async () => {
        renderModal();
        await reply('Nowa strona internetowa');
        await reply('Gastronomia');
        await screen.findByText(qualifier.steps.hasSite.prompt);
        fireEvent.click(screen.getByRole('button', { name: /Wstecz/ }));
        expect(await screen.findByRole('button', { name: /Gastronomia/ })).toHaveAttribute('aria-pressed', 'true');
        expect(chat().queryByText('Gastronomia, hotel, turystyka', { selector: '.lq-bubble--user' })).toBeNull();
    });

    it('restarts from the changed tile and removes the obsolete branch', async () => {
        renderModal();
        await walkToDiagnosis();
        await accept();
        const phone = screen.getByLabelText('Telefon');
        fireEvent.change(phone, { target: { value: '512345678' } });
        await reply('Nowa strona internetowa', chat());
        expect(phone).toHaveValue('512 345 678');

        await reply('Awaria', chat());
        expect(screen.getByRole('button', { name: /Awaria/ })).toHaveAttribute('aria-pressed', 'true');
        expect(chat().queryByText(qualifier.steps.industry.prompt)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Oddzwoń do mnie' })).toBeInTheDocument();
        expect(loadLeadSession().qualifierAnswers).toEqual({ service: 'emergency' });
    });

    it('limits multiple choice to two answers', async () => {
        renderModal();
        await reply('Nowa strona internetowa');
        await reply('Inna branża');
        await reply('Tak, ale chcę nową');
        await reply('Nie przynosi klientów');
        await reply('Działa wolno');
        expect(screen.getByRole('button', { name: /Wygląda przestarzale/ })).toBeDisabled();
    });

    it('validates the contact form and sends the lead with the relevant answers', async () => {
        renderModal();
        await walkToDiagnosis();
        await accept();

        fireEvent.click(await screen.findByRole('button', { name: 'Chcę bezpłatną propozycję' }));
        expect(screen.getByText('Podaj 9-cyfrowy numer telefonu.')).toBeInTheDocument();
        expect(screen.getByText(/Zaznacz zgodę/)).toBeInTheDocument();
        expect(screen.getByLabelText('Telefon')).toHaveFocus();
        expect(submitLead).not.toHaveBeenCalled();

        await fillContact();
        expect(screen.getByLabelText('Telefon')).toHaveValue('512 345 678');
        fireEvent.click(screen.getByRole('button', { name: 'Chcę bezpłatną propozycję' }));

        expect(await screen.findByText('Dzięki, Jan!')).toBeInTheDocument();
        expect(submitLead).toHaveBeenCalledWith({
            name: 'Jan',
            phone: '512345678',
            email: '',
            consent: true,
            consentText: 'Wyrażam zgodę na kontakt w sprawie mojego zgłoszenia i przetwarzanie podanych danych zgodnie z Polityką prywatności.',
            fax: '',
            source: 'qualifier',
            page: '/services',
            lang: 'pl',
            answers: {
                service: 'website',
                industry: 'gastro',
                hasSite: 'no',
                siteGoals: ['booking'],
                timeline: 'asap',
            },
        });
        expect(chat().getByText(qualifier.chat.contactSent)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Wstecz/ })).not.toBeInTheDocument();
    });

    it('sends the lead without a name, which is optional', async () => {
        renderModal();
        await walkToDiagnosis();
        await accept();
        await fillContact('');
        fireEvent.click(screen.getByRole('button', { name: 'Chcę bezpłatną propozycję' }));

        expect(await screen.findByText(qualifier.thanks.title_anonymous)).toBeInTheDocument();
        expect(submitLead).toHaveBeenCalledWith(expect.objectContaining({ name: '', phone: '512345678' }));
    });

    it('shows an error and allows retrying when sending fails', async () => {
        submitLead.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        renderModal();
        await reply('Awaria');
        expect(await screen.findByText(qualifier.steps.service.options.emergency.reaction)).toBeInTheDocument();
        await fillContact('Ola', '+48 600 100 200');
        fireEvent.click(screen.getByRole('button', { name: 'Oddzwoń do mnie' }));
        expect(await screen.findByText(/Nie udało się wysłać/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Oddzwoń do mnie' }));
        expect(await screen.findByText(qualifier.thanks.text.emergency)).toBeInTheDocument();
        expect(submitLead).toHaveBeenLastCalledWith(expect.objectContaining({
            phone: '600100200',
            answers: { service: 'emergency' },
        }));
    });

    it('offers an email-only proposal to people who are just looking around', async () => {
        renderModal();
        await reply('Wsparcie IT');
        await reply('Inna branża');
        await reply('Serwer, hosting, poczta firmowa');
        await reply('Brak kopii zapasowych');
        await reply('Dalej');
        await reply('Tylko się rozglądam');
        await accept(qualifier.diagnosis.softCta);
        expect(await screen.findByLabelText('E-mail')).toBeInTheDocument();
        expect(screen.queryByLabelText('Telefon')).not.toBeInTheDocument();
    });

    it('sends the optional follow-up note after the lead', async () => {
        renderModal();
        await walkToDiagnosis();
        await accept();
        await fillContact();
        fireEvent.click(screen.getByRole('button', { name: 'Chcę bezpłatną propozycję' }));
        fireEvent.change(await screen.findByLabelText(/Co już masz/), { target: { value: 'Mam logo' } });
        fireEvent.click(screen.getByRole('button', { name: 'Dopisz do zgłoszenia' }));
        expect(await screen.findByText(/dopisałem/)).toBeInTheDocument();
        expect(submitLeadNote).toHaveBeenCalledWith('Mam logo');
    });

    it('closes with Escape and reports that answers were saved midway', async () => {
        const onClose = jest.fn();
        renderModal(onClose);
        await reply('Aplikacja dla firmy');
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledWith({ savedMidway: true });
    });

    it('starts after the service the visitor already named in the chat', async () => {
        updateLeadSession({ chat: { service: 'app' } });
        renderModal();
        expect(await screen.findByText(qualifier.steps.industry.prompt)).toBeInTheDocument();
        expect(chat().getByText('Aplikacja dla firmy', { selector: '.lq-bubble--user' })).toBeInTheDocument();
        expect(screen.getByText('Krok 2 z 5')).toBeInTheDocument();
    });

    it('shares the answers with the chat', async () => {
        renderModal();
        await reply('Wsparcie IT');
        await reply('Inna branża');
        await screen.findByText(qualifier.steps.itNeed.prompt);
        expect(loadLeadSession().qualifierAnswers).toEqual({ service: 'it', industry: 'other' });
    });

    it('adds the answers to an existing lead instead of asking for contact again', async () => {
        updateLeadSession({ leadSent: { name: 'Ola' } });
        renderModal();
        await walkToDiagnosis();
        await accept();

        expect(await screen.findByText('Dzięki, Ola!')).toBeInTheDocument();
        expect(screen.getByText(qualifier.thanks.text.noted)).toBeInTheDocument();
        expect(screen.queryByLabelText('Telefon')).not.toBeInTheDocument();
        expect(submitLead).not.toHaveBeenCalled();
        expect(submitLeadNote).toHaveBeenCalledWith(expect.stringMatching(
            /^Odpowiedzi z kwalifikatora: Usługa: Nowa strona internetowa; Branża: Gastronomia, hotel, turystyka;/
        ));
    });

    it('asks for contact when adding to the existing lead fails', async () => {
        updateLeadSession({ leadSent: { name: 'Ola' } });
        submitLeadNote.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        renderModal();
        await walkToDiagnosis();
        await accept();
        expect(await screen.findByLabelText('Telefon')).toBeInTheDocument();
    });

    it('restores the saved conversation when opened again', async () => {
        renderModal();
        await reply('Poprawki i rozbudowa');
        await reply('Handel, sklep');
        await screen.findByText(qualifier.steps.fixTarget.prompt);
        cleanup();
        renderModal();
        expect(await screen.findByText(qualifier.steps.fixTarget.prompt)).toBeInTheDocument();
        expect(chat().getByText('Handel, sklep', { selector: '.lq-bubble--user' })).toBeInTheDocument();
        expect(chat().getByRole('button', { name: /Poprawki i rozbudowa/ })).toHaveAttribute('aria-pressed', 'true');
    });
});
