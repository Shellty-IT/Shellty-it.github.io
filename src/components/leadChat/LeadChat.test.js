import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import pl from '../../locales/pl/translation.json';
import LeadChat, { TEASER_DELAY_MS } from './LeadChat';
import ChatWindow from './ChatWindow';
import { sendChatMessage, submitLead, submitLeadNote } from '../../leads/leadApi';
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

const log = () => within(screen.getByRole('log'));
const reply = async (name) => {
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

describe('ChatWindow', () => {
    it('identifies the AI assistant on opening and provides access to the privacy policy', async () => {
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />);
        expect(screen.getByRole('heading', { name: 'Asystent AI Tomka' })).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: chat.privacyLink }));
        expect(await screen.findByRole('heading', { name: pl.privacyPolicy.title })).toBeInTheDocument();
    });

    it('greets according to the page and offers the main topics', async () => {
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />, '/portfolio');
        expect(screen.getByRole('dialog')).toHaveAccessibleName(chat.title);
        expect(await screen.findByText(chat.greetings.portfolio)).toBeInTheDocument();
        for (const topic of ['website', 'app', 'it', 'writeToTomek']) {
            expect(screen.getByRole('button', { name: chat.replies[topic] })).toBeInTheDocument();
        }
        expect(screen.queryByRole('button', { name: 'Pokaż realizacje' })).not.toBeInTheDocument();
    });

    it('keeps the conversation and answers quick replies with the next step', async () => {
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />);
        await reply(chat.replies.app);
        await reply(chat.replies.appAi);
        expect(await screen.findByText(chat.nodes.appAi.messages[0])).toBeInTheDocument();
        expect(log().getByText(chat.replies.app, { selector: '.lq-bubble--user' })).toBeInTheDocument();
        expect(log().getByText(chat.replies.appAi, { selector: '.lq-bubble--user' })).toBeInTheDocument();
        expect(log().queryByRole('link')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: chat.replies.contact })).toBeInTheDocument();
    });

    it('points to the Portfolio tab when explicitly asked for previous work', async () => {
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />);
        await screen.findByText(chat.greetings.home);
        send('Pokażesz jakieś realizacje?');
        expect(await screen.findByText(chat.nodes.portfolio.messages[0])).toBeInTheDocument();
        expect(log().queryByRole('link')).not.toBeInTheDocument();
    });

    it('answers a typed price question with value first and no amount', async () => {
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />);
        await screen.findByText(chat.greetings.home);
        send('Ile kosztuje strona?');
        expect(await screen.findByText(chat.nodes.pricing.messages[0])).toBeInTheDocument();
        expect(screen.getByRole('dialog').textContent).not.toMatch(/\d+\s*zł/);
    });

    it('shows the cooperation steps when the user asks about them', async () => {
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />);
        await screen.findByText(chat.greetings.home);
        send(chat.replies.process);

        expect(await screen.findByText('Propozycja rozwiązania i wycena')).toBeInTheDocument();
        expect(screen.getByLabelText(chat.inputLabel)).toBeEnabled();
    });

    it('restores a saved conversation about the cooperation process', async () => {
        updateLeadSession({ chat: { turns: [{ from: 'bot', node: 'process' }] } });
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />);

        expect(await screen.findByText('Wsparcie po wdrożeniu')).toBeInTheDocument();
        expect(screen.getByLabelText(chat.inputLabel)).toBeEnabled();
    });

    it('passes an unrecognised message to Tomek and sends it with the lead', async () => {
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />, '/services');
        await reply(chat.replies.website);
        await screen.findByText(chat.nodes.website.messages[1]);
        send('Dzień dobry, mam nietypową sprawę');
        expect(await screen.findByText(chat.nodes.unknown.messages[0])).toBeInTheDocument();
        expect(screen.getByLabelText(pl.qualifier.contact.fields.message)).toHaveValue('Dzień dobry, mam nietypową sprawę');

        fireEvent.change(screen.getByLabelText('Imię (opcjonalnie)'), { target: { value: 'Ola' } });
        fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '600100200' } });
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: pl.qualifier.contact.chat.submit }));

        expect(await screen.findByText(pl.chat.nodes.thanks.messages[0])).toBeInTheDocument();
        expect(submitLead).toHaveBeenCalledWith({
            name: 'Ola',
            phone: '600100200',
            email: '',
            consent: true,
            consentText: 'Wyrażam zgodę na kontakt w sprawie mojego zgłoszenia i przetwarzanie podanych danych zgodnie z Polityką prywatności.',
            fax: '',
            source: 'chat',
            page: '/services',
            lang: 'pl',
            answers: { service: 'website', message: 'Dzień dobry, mam nietypową sprawę' },
            chatSummary: `${chat.replies.website} → Dzień dobry, mam nietypową sprawę`,
        });
    });

    it('adds later messages to the submitted lead', async () => {
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />);
        fireEvent.change(screen.getByLabelText(chat.inputLabel), { target: { value: 'Chcę zapytać o nową stronę' } });
        await reply(chat.replies.writeToTomek);
        expect(await screen.findByLabelText(pl.qualifier.contact.fields.message)).toHaveValue('Chcę zapytać o nową stronę');
        expect(sendChatMessage).not.toHaveBeenCalled();
        fireEvent.change(await screen.findByLabelText('Imię (opcjonalnie)'), { target: { value: 'Jan' } });
        fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '512345678' } });
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: pl.qualifier.contact.chat.submit }));
        await screen.findByText(pl.chat.nodes.thanks.messages[0]);
        expect(submitLead).toHaveBeenCalledWith(expect.objectContaining({
            source: 'chat',
            answers: { message: 'Chcę zapytać o nową stronę' },
        }));

        send('Najlepiej po 16');
        expect(await screen.findByText(chat.nodes.noted.messages[0])).toBeInTheDocument();
        expect(submitLeadNote).toHaveBeenCalledWith('Najlepiej po 16');
    });

    it('asks only for a phone number during an IT emergency', async () => {
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />);
        await reply(chat.replies.it);
        await reply(chat.replies.itEmergency);
        expect(await screen.findByLabelText('Telefon')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Napisz na e-mail/ })).not.toBeInTheDocument();
    });

    it('opens the qualifier and closes with Escape', async () => {
        const onOpenQualifier = jest.fn();
        const onClose = jest.fn();
        renderWithProviders(<ChatWindow onClose={onClose} onOpenQualifier={onOpenQualifier} />);
        await reply(chat.replies.website);
        await reply(chat.replies.websiteNew);
        await reply(chat.replies.qualifier);
        expect(onOpenQualifier).toHaveBeenCalled();
        fireEvent.keyDown(screen.getByLabelText(chat.inputLabel), { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });
});

describe('ChatWindow with the AI assistant', () => {
    const aiAnswer = (overrides = {}) => ({
        reply: 'Rozumiem. Czym zajmuje się Twoja restauracja?',
        quickReplies: ['Pizzeria', 'Kawiarnia'],
        action: 'none',
        signals: { service: 'website' },
        ...overrides,
    });

    it('sends a typed question with the conversation and shows the answer', async () => {
        sendChatMessage.mockResolvedValueOnce(aiAnswer());
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />, '/services');
        await screen.findByText(chat.greetings.services);
        send('Potrzebuję strony dla restauracji');

        expect(await screen.findByText('Rozumiem. Czym zajmuje się Twoja restauracja?')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Pizzeria' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: chat.replies.writeToTomek })).toBeInTheDocument();
        const { messages, lang, page } = sendChatMessage.mock.calls[0][0];
        expect({ lang, page }).toEqual({ lang: 'pl', page: '/services' });
        expect(messages[0]).toEqual({
            role: 'assistant',
            content: `${chat.greetings.services} ${chat.nodes.start.messages[0]}`,
        });
        expect(messages[messages.length - 1]).toEqual({ role: 'user', content: 'Potrzebuję strony dla restauracji' });
    });

    it('continues the AI conversation without displaying legacy project cards or their suggestions', async () => {
        sendChatMessage
            .mockResolvedValueOnce(aiAnswer())
            .mockResolvedValueOnce(aiAnswer({
                reply: 'Czy klienci mają móc rezerwować stoliki przez stronę?',
                quickReplies: ['Chcę zobaczyć przykład'],
                action: 'show_project:tomiForno',
            }));
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />);
        await screen.findByText(chat.greetings.home);
        send('Chcę stronę');
        await reply('Pizzeria');

        expect(await screen.findByText('Czy klienci mają móc rezerwować stoliki przez stronę?')).toBeInTheDocument();
        expect(log().queryByRole('link')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Chcę zobaczyć przykład' })).not.toBeInTheDocument();
        const history = sendChatMessage.mock.calls[1][0].messages;
        expect(history.slice(-3)).toEqual([
            { role: 'user', content: 'Chcę stronę' },
            { role: 'assistant', content: 'Rozumiem. Czym zajmuje się Twoja restauracja?' },
            { role: 'user', content: 'Pizzeria' },
        ]);
    });

    it('shows the contact card when the assistant asks for it and sends the lead with the AI context', async () => {
        sendChatMessage.mockResolvedValueOnce(aiAnswer({
            reply: 'Tomek przygotuje propozycję - jak najlepiej się z Tobą skontaktować?',
            quickReplies: [],
            action: 'show_contact_card',
            signals: { service: 'app' },
        }));
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />);
        await screen.findByText(chat.greetings.home);
        send('Chcę zacząć jak najszybciej');

        fireEvent.change(await screen.findByLabelText('Imię (opcjonalnie)'), { target: { value: 'Ewa' } });
        fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '512345678' } });
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: pl.qualifier.contact.chat.submit }));

        expect(await screen.findByText(pl.chat.nodes.thanks.messages[0])).toBeInTheDocument();
        expect(submitLead).toHaveBeenCalledWith(expect.objectContaining({
            source: 'chat',
            answers: { service: 'app' },
            chatSummary: 'Chcę zacząć jak najszybciej',
        }));
    });

    it('offers the qualifier when the assistant suggests it', async () => {
        const onOpenQualifier = jest.fn();
        sendChatMessage.mockResolvedValueOnce(aiAnswer({ quickReplies: [], action: 'open_qualifier' }));
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={onOpenQualifier} />);
        await screen.findByText(chat.greetings.home);
        send('Nie wiem, czego potrzebuję');
        await reply(chat.replies.qualifier);
        expect(onOpenQualifier).toHaveBeenCalled();
    });

    it('falls back to the scripted answers when the assistant is unavailable', async () => {
        sendChatMessage.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />);
        await screen.findByText(chat.greetings.home);
        send('Ile kosztuje strona?');
        expect(await screen.findByText(chat.nodes.pricing.messages[0])).toBeInTheDocument();
    });
});

describe('ChatWindow after the qualifier', () => {
    const qualifierAnswers = { service: 'website', industry: 'gastro', siteGoals: ['booking'], timeline: 'asap' };
    const summary = 'Usługa: Nowa strona internetowa; Branża: Gastronomia, hotel, turystyka; '
        + 'Cel strony: Rezerwacje lub zamówienia online; Termin: Jak najszybciej';

    it('shows the qualifier answers instead of asking again', async () => {
        updateLeadSession({ qualifierAnswers });
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />);
        expect(await screen.findByText(chat.nodes.fromQualifier.messages[0])).toBeInTheDocument();
        expect(screen.getByText('Branża')).toBeInTheDocument();
        expect(screen.getByText('Gastronomia, hotel, turystyka')).toBeInTheDocument();
        expect(screen.getByText('Rezerwacje lub zamówienia online')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: chat.replies.contact })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: chat.replies.process })).not.toBeInTheDocument();
    });

    it('shows the answers only once per set of answers', async () => {
        updateLeadSession({ qualifierAnswers });
        const { unmount } = renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />);
        await screen.findByText(chat.nodes.fromQualifier.messages[0]);
        unmount();
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />);
        await screen.findByText(chat.nodes.fromQualifier.messages[0]);
        expect(screen.getAllByText('Gastronomia, hotel, turystyka')).toHaveLength(1);
    });

    it('gives the assistant the qualifier answers as context', async () => {
        updateLeadSession({ qualifierAnswers });
        sendChatMessage.mockResolvedValueOnce({ reply: 'Jasne, rezerwacje online to dobry kierunek.', quickReplies: [], action: 'none' });
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />);
        await screen.findByText(chat.nodes.fromQualifier.messages[0]);
        send('Czy da się podpiąć płatności?');
        await screen.findByText('Jasne, rezerwacje online to dobry kierunek.');
        expect(sendChatMessage).toHaveBeenCalledWith(expect.objectContaining({ context: summary }));
    });

    it('sends the qualifier answers with a chat lead and remembers the lead', async () => {
        updateLeadSession({ qualifierAnswers });
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />);
        await reply(chat.replies.contact);
        fireEvent.change(await screen.findByLabelText('Imię (opcjonalnie)'), { target: { value: 'Jan' } });
        fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '512345678' } });
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: pl.qualifier.contact.chat.submit }));
        await screen.findByText(pl.chat.nodes.thanks.messages[0]);
        expect(submitLead).toHaveBeenCalledWith(expect.objectContaining({ answers: qualifierAnswers }));
        expect(loadLeadSession().leadSent).toEqual({ name: 'Jan' });
    });

    it('does not ask for contact again after a lead from the qualifier', async () => {
        updateLeadSession({ qualifierAnswers, leadSent: { name: 'Ola' } });
        renderWithProviders(<ChatWindow onClose={jest.fn()} onOpenQualifier={jest.fn()} />);
        await screen.findByText(chat.nodes.fromQualifier.after);
        expect(screen.queryByRole('button', { name: chat.replies.writeToTomek })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: chat.replies.contact })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: chat.replies.process })).not.toBeInTheDocument();
        send('Najlepiej dzwonić po 16');
        expect(await screen.findByText(chat.nodes.noted.messages[0])).toBeInTheDocument();
        expect(submitLeadNote).toHaveBeenCalledWith('Najlepiej dzwonić po 16');
        expect(sendChatMessage).not.toHaveBeenCalled();
    });
});

describe('LeadChat teaser', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const renderLauncher = (path) => renderWithProviders(
        <LeadChat open={false} onOpen={jest.fn()} onClose={jest.fn()} onOpenQualifier={jest.fn()} />,
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
