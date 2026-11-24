import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import pl from '../../locales/pl/translation.json';
import LeadFunnel from './LeadFunnel';
import { sendChatMessage } from '../../leads/leadApi';
import { loadLeadSession } from '../../leads/leadSession';

jest.mock('react-router-dom', () => {
    const { TextDecoder, TextEncoder } = require('util');
    Object.assign(global, { TextDecoder, TextEncoder });
    return jest.requireActual('react-router');
}, { virtual: true });

jest.mock('../../leads/leadApi', () => ({
    ...jest.requireActual('../../leads/leadApi'),
    sendChatMessage: jest.fn(),
}));

const i18n = i18next.createInstance();
i18n.use(initReactI18next).init({
    lng: 'pl',
    resources: { pl: { translation: pl } },
    interpolation: { escapeValue: false },
});

beforeEach(() => {
    jest.useFakeTimers();
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    sessionStorage.clear();
    localStorage.clear();
});

afterEach(() => jest.useRealTimers());

function renderFunnel() {
    render(
        <I18nextProvider i18n={i18n}>
            <MemoryRouter initialEntries={['/']}>
                <LeadFunnel />
            </MemoryRouter>
        </I18nextProvider>
    );
}

describe('LeadFunnel', () => {
    it('shows both launchers on the first render', () => {
        renderFunnel();
        expect(screen.getByRole('button', { name: pl.qualifier.launcher.label })).toBeVisible();
        expect(screen.getByRole('button', { name: pl.chat.launcherAria })).toBeVisible();
    });

    it('shares the answers between the chat and the qualifier', async () => {
        const { steps } = pl.qualifier;
        renderFunnel();
        fireEvent.click(screen.getByRole('button', { name: pl.chat.launcherAria }));
        fireEvent.click(await screen.findByRole('button', { name: steps.service.options.website.label }));
        expect(await screen.findByText(steps.hasSite.prompt)).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: pl.qualifier.launcher.label }));
        expect(await screen.findByRole('dialog', { name: pl.qualifier.rail.name })).toBeVisible();
        expect(screen.getByText(steps.hasSite.prompt)).toBeVisible();
        expect(loadLeadSession().engaged).toBe(true);
    });

    it.each([true, false])('keeps a pending chat reply after closing (reopened before reply: %s)', async (reopenBeforeReply) => {
        let resolveReply;
        sendChatMessage.mockReset().mockReturnValueOnce(new Promise((resolve) => { resolveReply = resolve; }));
        renderFunnel();
        const openChat = () => fireEvent.click(screen.getByRole('button', { name: pl.chat.launcherAria }));
        const input = () => screen.getByLabelText(pl.chat.inputLabel);
        const answer = 'Mogę pomóc dobrać stronę do Twojej firmy.';

        openChat();
        await screen.findByText(pl.chat.nodes.start);
        fireEvent.change(input(), { target: { value: 'Potrzebuję strony' } });
        fireEvent.submit(input().form);
        expect(sendChatMessage).toHaveBeenCalledTimes(1);
        fireEvent.keyDown(input(), { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        if (reopenBeforeReply) openChat();
        await act(async () => resolveReply({ reply: answer }));
        if (!reopenBeforeReply) openChat();

        expect(await screen.findByText(answer)).toBeVisible();
        expect(screen.getAllByText('Potrzebuję strony', { selector: '.lq-bubble--user' })).toHaveLength(1);
        expect(sendChatMessage).toHaveBeenCalledTimes(1);
    });
});
