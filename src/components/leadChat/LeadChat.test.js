import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import pl from '../../locales/pl/translation.json';
import LeadChat, { TEASER_DELAY_MS } from './LeadChat';
import ChatWindow from './ChatWindow';
import { LeadApiError, sendChatMessage, submitLead, submitLeadNote } from '../../leads/leadApi';
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
    sendChatMessage: jest.fn(),
}));

const i18n = i18next.createInstance();
i18n.use(initReactI18next).init({
    lng: 'pl',
    resources: { pl: { translation: pl } },
    interpolation: { escapeValue: false },
});

const { chat } = pl;

function renderWithProviders(ui, path = '/') {
    return render(
        <I18nextProvider i18n={i18n}>
            <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
        </I18nextProvider>
    );
}

const click = async (name) => {
    fireEvent.click(await screen.findByRole('button', { name }));
};
const send = (text) => {
    fireEvent.change(screen.getByLabelText(chat.inputLabel), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: chat.send }));
};

beforeEach(() => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    sessionStorage.clear();
    localStorage.clear();
    submitLead.mockReset().mockResolvedValue({ ok: true });
    submitLeadNote.mockReset().mockResolvedValue({ ok: true });
    sendChatMessage.mockReset().mockResolvedValue({ fallback: true, reason: 'providers' });
});

const { steps } = pl.qualifier;
const submissionSession = (minutesLeft) => ({
    token: 'lead-token',
    expiresAt: new Date(Date.now() + minutesLeft * 60 * 1000).toISOString(),
});
const typePhone = (value) => fireEvent.change(screen.getByLabelText(pl.qualifier.contact.fields.phone), { target: { value } });
const submitPhone = () => fireEvent.click(screen.getByRole('button', { name: pl.qualifier.phone.submit }));

describe('ChatWindow', () => {
    it('identifies the AI assistant without focusing the message field', async () => {
        renderWithProviders(<ChatWindow onClose={jest.fn()} />);
        expect(screen.getByRole('heading', { name: chat.title })).toBeVisible();
        expect(screen.getByRole('dialog')).toHaveAccessibleDescription(chat.subtitle);
        expect(await screen.findByText(chat.nodes.start)).toBeVisible();
        expect(screen.getByLabelText(chat.inputLabel)).not.toHaveFocus();
        fireEvent.click(screen.getByRole('button', { name: chat.privacyLink }));
        expect(await screen.findByRole('heading', { name: pl.privacyPolicy.title })).toBeInTheDocument();
    });

    it('leads from the service tiles to a phone number only', async () => {
        renderWithProviders(<ChatWindow onClose={jest.fn()} />, '/services');
        await click(steps.service.options.website.label);
        await click(steps.hasSite.options.yes_fix.label);
        await click(steps.timeline.options.asap.label);

        expect(await screen.findByText(chat.nodes.contact)).toBeVisible();
        expect(screen.queryByLabelText(chat.inputLabel)).toBeNull();
        expect(screen.queryByRole('checkbox')).toBeNull();
        typePhone('512 345 678');
        submitPhone();

        expect(await screen.findByText(chat.nodes.thanks)).toBeVisible();
        expect(submitLead).toHaveBeenCalledWith(expect.objectContaining({
            phone: '512345678',
            name: '',
            source: 'chat',
            page: '/services',
            answers: { service: 'website', hasSite: 'yes_fix', timeline: 'asap' },
            chatSummary: '',
        }));
        expect(loadLeadSession().leadSent).toEqual({ name: '' });
        expect(loadLeadSession().qualifier).toBeNull();
    });

    it('asks only for a phone number during an emergency', async () => {
        renderWithProviders(<ChatWindow onClose={jest.fn()} />);
        await click(steps.service.options.emergency.label);
        expect(await screen.findByText(chat.nodes.contactEmergency)).toBeVisible();
        expect(screen.queryByRole('button', { name: pl.qualifier.phone.useEmail })).toBeNull();
    });

    it('closes with Escape', async () => {
        const close = jest.fn();
        renderWithProviders(<ChatWindow onClose={close} />);
        await screen.findByText(chat.nodes.start);
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
        expect(close).toHaveBeenCalled();
    });
});

describe('ChatWindow with the AI assistant', () => {
    const aiAnswer = (overrides = {}) => ({
        reply: 'Tak, zrobię stronę z rezerwacjami online.',
        quickReplies: ['Pizzeria', 'Kawiarnia'],
        action: 'none',
        signals: { service: 'website' },
        ...overrides,
    });

    it('answers a typed question briefly and offers a call', async () => {
        sendChatMessage.mockResolvedValueOnce(aiAnswer());
        renderWithProviders(<ChatWindow onClose={jest.fn()} />, '/services');
        await screen.findByText(chat.nodes.start);
        send('Czy zrobisz stronę z rezerwacjami?');

        expect(await screen.findByText('Tak, zrobię stronę z rezerwacjami online.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Pizzeria' })).toBeNull();
        const { messages, lang, page } = sendChatMessage.mock.calls[0][0];
        expect({ lang, page }).toEqual({ lang: 'pl', page: '/services' });
        expect(messages).toEqual([
            { role: 'assistant', content: chat.nodes.start },
            { role: 'user', content: 'Czy zrobisz stronę z rezerwacjami?' },
        ]);

        await click(chat.callMe);
        expect(await screen.findByText(chat.nodes.contact)).toBeVisible();
        typePhone('512345678');
        submitPhone();
        await screen.findByText(chat.nodes.thanks);
        expect(submitLead).toHaveBeenCalledWith(expect.objectContaining({
            source: 'chat',
            chatSummary: 'Czy zrobisz stronę z rezerwacjami?',
        }));
    });

    it('shows the phone field at once when the assistant asks for contact', async () => {
        sendChatMessage.mockResolvedValueOnce(aiAnswer({ reply: 'Tomek przygotuje propozycję.', action: 'show_contact_card' }));
        renderWithProviders(<ChatWindow onClose={jest.fn()} />);
        await screen.findByText(chat.nodes.start);
        send('Chcę zacząć jak najszybciej');
        expect(await screen.findByLabelText(pl.qualifier.contact.fields.phone)).toBeVisible();
        expect(screen.getByRole('button', { name: pl.qualifier.phone.useEmail })).toBeVisible();
    });

    it('shows the topic tiles when the assistant suggests choosing a topic', async () => {
        sendChatMessage.mockResolvedValueOnce(aiAnswer({ reply: 'Wybierz temat.', action: 'open_qualifier' }));
        renderWithProviders(<ChatWindow onClose={jest.fn()} />);
        await screen.findByText(chat.nodes.start);
        send('Nie wiem, czego potrzebuję');
        await screen.findByText('Wybierz temat.');
        expect(screen.getAllByRole('button', { name: steps.service.options.app.label })).toHaveLength(1);
    });

    it('asks for a phone number when the assistant is unavailable', async () => {
        sendChatMessage.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        renderWithProviders(<ChatWindow onClose={jest.fn()} />);
        await screen.findByText(chat.nodes.start);
        send('Ile kosztuje strona?');
        expect(await screen.findByText(chat.nodes.fallback)).toBeInTheDocument();
        expect(screen.getByLabelText(pl.qualifier.contact.fields.phone)).toBeVisible();
    });
});

describe('ChatWindow and the qualifier', () => {
    it('continues where the visitor stopped instead of repeating the answers', async () => {
        updateLeadSession({ qualifier: { answers: { service: 'website', hasSite: 'no' } } });
        sendChatMessage.mockResolvedValueOnce({ reply: 'Jasne.', quickReplies: [], action: 'none' });
        renderWithProviders(<ChatWindow onClose={jest.fn()} />);
        expect(await screen.findByText(steps.timeline.prompt)).toBeVisible();
        expect(screen.queryByText(chat.nodes.start)).toBeNull();
        send('Czy da się podpiąć płatności?');
        await screen.findByText('Jasne.');
        expect(sendChatMessage).toHaveBeenCalledWith(expect.objectContaining({
            context: 'Usługa: Nowa strona; Obecna strona: Nie, zaczynam od zera',
        }));
    });

    it('does not ask for contact again after a lead was sent', async () => {
        updateLeadSession({ leadSent: { name: '' }, submissionSession: submissionSession(60) });
        renderWithProviders(<ChatWindow onClose={jest.fn()} />);
        expect(await screen.findByText(chat.nodes.sent)).toBeVisible();
        expect(screen.queryByRole('button', { name: steps.service.options.website.label })).toBeNull();
        send('Najlepiej dzwonić po 16');
        expect(await screen.findByText(chat.nodes.noted)).toBeInTheDocument();
        expect(submitLeadNote).toHaveBeenCalledWith('Najlepiej dzwonić po 16');
        expect(sendChatMessage).not.toHaveBeenCalled();
    });

    it('asks for the number again when a note can no longer reach the earlier lead', async () => {
        updateLeadSession({ leadSent: { name: '' }, submissionSession: submissionSession(60) });
        submitLeadNote.mockRejectedValueOnce(new LeadApiError(401, 'invalid_session'));
        renderWithProviders(<ChatWindow onClose={jest.fn()} />);
        await screen.findByText(chat.nodes.sent);
        send('Najlepiej dzwonić po 16');
        expect(await screen.findByText(chat.nodes.contact)).toBeVisible();
        typePhone('512345678');
        submitPhone();
        await screen.findByText(chat.nodes.thanks);
        expect(submitLead).toHaveBeenCalledWith(expect.objectContaining({ chatSummary: 'Najlepiej dzwonić po 16' }));
    });
});

describe('LeadChat teaser', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const renderLauncher = (path) => renderWithProviders(
        <LeadChat open={false} onOpen={jest.fn()} onClose={jest.fn()} />,
        path
    );
    const waitForTeaser = () => act(() => jest.advanceTimersByTime(TEASER_DELAY_MS));

    it('shows a page-specific teaser once per session', () => {
        const { unmount } = renderLauncher('/services');
        expect(screen.queryByText(chat.teasers.services)).not.toBeInTheDocument();
        act(() => jest.advanceTimersByTime(TEASER_DELAY_MS));
        expect(screen.getByText(chat.teasers.services)).toBeInTheDocument();
        unmount();

        renderLauncher('/services');
        waitForTeaser();
        expect(screen.queryByText(chat.teasers.services)).not.toBeInTheDocument();
    });

    it('does not show the teaser on the contact page', () => {
        renderLauncher('/contact');
        waitForTeaser();
        expect(screen.getByRole('button', { name: chat.launcherAria })).toBeInTheDocument();
        expect(screen.queryByText(chat.teasers.default)).not.toBeInTheDocument();
    });

    it('does not show the teaser after the visitor opened the qualifier or the chat', () => {
        updateLeadSession({ engaged: true });
        renderLauncher('/');
        waitForTeaser();
        expect(screen.queryByText(chat.teasers.home)).not.toBeInTheDocument();
    });

    it('hides the teaser by itself after a while', () => {
        renderLauncher('/');
        waitForTeaser();
        expect(screen.getByText(chat.teasers.home)).toBeInTheDocument();
        act(() => jest.advanceTimersByTime(12000));
        expect(screen.queryByText(chat.teasers.home)).not.toBeInTheDocument();
    });
});
