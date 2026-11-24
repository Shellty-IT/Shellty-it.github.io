import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { FaPaperPlane, FaTimes } from 'react-icons/fa';
import { CONTACT_STEP, QUESTION_STEPS } from '../../leads/qualifierConfig';
import { conversationSteps, relevantAnswers } from '../../leads/qualifierEngine';
import { loadLeadSession, updateLeadSession } from '../../leads/leadSession';
import { isLeadNoteUnavailable, sendChatMessage, submitLead, submitLeadNote } from '../../leads/leadApi';
import {
    clearQualifierAnswers,
    markLeadSent,
    qualifierAnswers,
    qualifierSummary,
    saveQualifierAnswers,
    sentLead,
    summaryText,
} from '../../leads/funnelContext';
import { trackEvent } from '../../leads/funnelEvents';
import PrivacyPolicyModal from '../contact/PrivacyPolicyModal';
import avatarSmall from '../../assets/avatar/tomek_small.webp';
import { setBackgroundPaused } from '../../background/backgroundPause';
import { BotTurn, TypingIndicator, UserMessage, scrollToTurn } from '../leadQualifier/Chat';
import PhoneStep from '../leadQualifier/PhoneStep';
import TileStep from '../leadQualifier/TileStep';
import '../leadQualifier/QualifierModal.css';

const STATE_VERSION = 2;
const TYPING_DELAY_MS = 600;
const REDUCED_TYPING_DELAY_MS = 150;
const PREVIOUS_REPLY_OFFSET = 72;
const MAX_MESSAGE = 500;
const MAX_SUMMARY = 2000;
const MAX_ASSISTANT_CONTEXT = 1000;
const HISTORY_LIMIT = 16;
const FULL_SCREEN_QUERY = '(max-width: 640px)';

function prefersReducedMotion() {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function pendingStep(answers) {
    return conversationSteps(answers).at(-1);
}

function withSharedProgress(state) {
    if (state.submitted) return state;
    if (sentLead()) return { ...state, submitted: true, turns: [...state.turns, { from: 'bot', node: 'sent' }] };
    const answers = qualifierAnswers();
    if (JSON.stringify(answers) === JSON.stringify(state.answers)) return state;
    const pending = pendingStep(answers);
    const lastTurn = state.turns.at(-1);
    const turns = lastTurn.step && lastTurn.step !== pending
        ? [...state.turns, { from: 'bot', step: pending }]
        : state.turns;
    return { ...state, answers, turns };
}

function initialState() {
    const saved = loadLeadSession().chat;
    if (saved?.version === STATE_VERSION && saved.turns?.length > 0) return withSharedProgress(saved);
    if (sentLead()) return { version: STATE_VERSION, answers: {}, submitted: true, turns: [{ from: 'bot', node: 'sent' }] };
    const answers = qualifierAnswers();
    return { version: STATE_VERSION, answers, submitted: false, turns: [{ from: 'bot', step: pendingStep(answers) }] };
}

export default function ChatWindow({ open = true, onClose }) {
    const { t, i18n } = useTranslation();
    const { pathname } = useLocation();
    const [state, setState] = useState(initialState);
    const [draft, setDraft] = useState('');
    const [waiting, setWaiting] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const hidePrivacy = useCallback(() => setShowPrivacy(false), []);
    const logRef = useRef(null);
    const currentTurnRef = useRef(null);
    const promptRef = useRef(null);

    const { turns, answers, submitted } = state;
    const lastIndex = turns.length - 1;
    const current = turns[lastIndex];
    const lang = i18n.language === 'en' ? 'en' : 'pl';
    const emergency = answers.service === 'emergency';
    const pending = pendingStep(answers);
    const [revealedIndex, setRevealedIndex] = useState(lastIndex - 1);
    const typing = revealedIndex < lastIndex;
    const showingPhone = !submitted && (
        current.step === CONTACT_STEP || current.node === 'fallback' || current.ai?.action === 'show_contact_card'
    );

    useEffect(() => {
        updateLeadSession({ chat: state });
    }, [state]);

    useEffect(() => {
        if (!submitted) saveQualifierAnswers(answers);
    }, [answers, submitted]);

    useEffect(() => {
        if (!open) {
            setDraft('');
            setShowPrivacy(false);
            return;
        }
        setState(withSharedProgress);
    }, [open]);

    useEffect(() => {
        if (!open || !window.matchMedia?.(FULL_SCREEN_QUERY).matches) return undefined;
        setBackgroundPaused(true);
        return () => setBackgroundPaused(false);
    }, [open]);

    useEffect(() => {
        if (revealedIndex >= lastIndex) return undefined;
        const delay = prefersReducedMotion() ? REDUCED_TYPING_DELAY_MS : TYPING_DELAY_MS;
        const timer = setTimeout(() => setRevealedIndex(lastIndex), delay);
        return () => clearTimeout(timer);
    }, [lastIndex, revealedIndex]);

    useEffect(() => {
        if (!open) return;
        const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
        if (typing || waiting) {
            logRef.current?.scrollTo?.({ top: logRef.current.scrollHeight, behavior });
            return;
        }
        if (!showingPhone) promptRef.current?.focus({ preventScroll: true });
        scrollToTurn(logRef.current, currentTurnRef.current, PREVIOUS_REPLY_OFFSET, behavior);
    }, [open, typing, waiting, lastIndex, showingPhone]);

    const botMessages = (turn) => {
        if (turn.ai) return [turn.ai.reply];
        if (turn.node) return [t(`chat.nodes.${turn.node}`)];
        if (turn.step === 'service') return [t('chat.nodes.start')];
        if (turn.step === CONTACT_STEP) return [t(emergency ? 'chat.nodes.contactEmergency' : 'chat.nodes.contact')];
        return [t(`qualifier.steps.${turn.step}.prompt`)];
    };

    const addTurns = (...newTurns) => {
        setState((previous) => ({ ...previous, turns: [...previous.turns, ...newTurns] }));
    };

    const answerStep = (stepId, value) => {
        setState((previous) => ({
            ...previous,
            answers: { ...relevantAnswers(previous.answers), [stepId]: value },
            turns: [
                ...previous.turns,
                { from: 'user', text: t(`qualifier.steps.${stepId}.options.${value}.label`) },
                { from: 'bot', step: QUESTION_STEPS[stepId].next(value) },
            ],
        }));
    };

    const askForCall = () => {
        addTurns({ from: 'user', text: t('chat.callMe') }, { from: 'bot', step: CONTACT_STEP });
    };

    const askAssistant = async (text) => {
        const history = turns.flatMap((turn) => {
            if (turn.from === 'user') return [{ role: 'user', content: turn.text }];
            return [{ role: 'assistant', content: botMessages(turn).join(' ').slice(0, MAX_ASSISTANT_CONTEXT) }];
        });
        const messages = [...history, { role: 'user', content: text }].slice(-HISTORY_LIMIT);
        addTurns({ from: 'user', text, typed: true });
        setWaiting(true);
        trackEvent('chat_message');

        let answer = null;
        try {
            const context = summaryText(qualifierSummary(t, answers));
            const result = await sendChatMessage({ messages, lang, page: pathname, context });
            if (!result.fallback) answer = result;
        } catch {}
        setWaiting(false);
        addTurns(answer
            ? { from: 'bot', ai: { reply: answer.reply, action: answer.action ?? 'none' } }
            : { from: 'bot', node: 'fallback' });
    };

    const sendMessage = async (event) => {
        event.preventDefault();
        const text = draft.trim();
        if (!text || waiting) return;
        setDraft('');
        if (!submitted) {
            await askAssistant(text);
            return;
        }
        try {
            await submitLeadNote(text);
            addTurns({ from: 'user', text }, { from: 'bot', node: 'noted' });
        } catch (error) {
            if (!isLeadNoteUnavailable(error)) {
                addTurns({ from: 'user', text }, { from: 'bot', node: 'noteFailed' });
                return;
            }
            setState((previous) => ({
                ...previous,
                submitted: false,
                turns: [...previous.turns, { from: 'user', text, typed: true }, { from: 'bot', step: CONTACT_STEP }],
            }));
        }
    };

    const sendLead = async ({ display, ...contact }) => {
        await submitLead({
            ...contact,
            name: '',
            source: 'chat',
            page: pathname,
            lang,
            answers,
            chatSummary: turns.filter((turn) => turn.typed).map((turn) => turn.text).join(' → ').slice(0, MAX_SUMMARY),
        });
        markLeadSent('');
        clearQualifierAnswers();
        trackEvent('lead_submitted', { source: 'chat' });
        setState((previous) => ({
            ...previous,
            submitted: true,
            turns: [...previous.turns, { from: 'user', text: display }, { from: 'bot', node: 'thanks' }],
        }));
    };

    const phoneStep = () => (
        <PhoneStep
            allowEmail={!emergency || current.step !== CONTACT_STEP}
            onSubmit={sendLead}
            onShowPrivacy={() => setShowPrivacy(true)}
        />
    );

    const renderActions = () => {
        if (submitted) return null;
        if (showingPhone) return phoneStep();
        if (current.step) return <TileStep stepId={current.step} onAnswer={(value) => answerStep(current.step, value)} />;
        if (current.ai?.action === 'open_qualifier' && pending !== CONTACT_STEP) {
            return <TileStep stepId={pending} onAnswer={(value) => answerStep(pending, value)} />;
        }
        if (current.ai) {
            return (
                <div className="lc-replies">
                    <button type="button" className="lc-reply lc-reply--accent" onClick={askForCall}>
                        {t('chat.callMe')}
                    </button>
                </div>
            );
        }
        return null;
    };

    if (!open) return null;

    return (
        <section
            className="lc-window"
            role="dialog"
            aria-modal="false"
            aria-labelledby="lc-title"
            aria-describedby="lc-subtitle"
            onKeyDown={(event) => {
                if (event.key === 'Escape' && !showPrivacy) onClose();
            }}
        >
            <header className="lc-header">
                <span className="lc-header__logo" aria-hidden="true">
                    <img src={avatarSmall} alt="" width="44" height="44" />
                </span>
                <div className="lc-header__text">
                    <h2 id="lc-title" className="lc-header__title">
                        {t('chat.title')}
                    </h2>
                    <p id="lc-subtitle" className="lc-header__subtitle">{t('chat.subtitle')}</p>
                </div>
                <button type="button" className="lq-icon-btn" onClick={onClose} aria-label={t('chat.closeAria')}>
                    <FaTimes aria-hidden="true" />
                </button>
            </header>

            <div ref={logRef} className="lq-chat lc-log" role="log" aria-labelledby="lc-title">
                {turns.map((turn, index) => {
                    const isCurrent = index === lastIndex;
                    if (turn.from === 'user') return <UserMessage key={index}>{turn.text}</UserMessage>;
                    if (isCurrent && typing) return <TypingIndicator key="typing" />;
                    return (
                        <div key={index} ref={isCurrent ? currentTurnRef : undefined} className="lq-turn">
                            <BotTurn
                                ref={isCurrent ? promptRef : undefined}
                                focusable={isCurrent}
                                ask={Boolean(turn.step)}
                                messages={botMessages(turn)}
                            >
                                {isCurrent && !waiting && renderActions()}
                            </BotTurn>
                        </div>
                    );
                })}
                {waiting && <TypingIndicator key="waiting" />}
            </div>

            {!showingPhone && (
                <form className="lc-input" onSubmit={sendMessage}>
                    <label className="lq-visually-hidden" htmlFor="lc-message">{t('chat.inputLabel')}</label>
                    <input
                        id="lc-message"
                        className="lq-input"
                        type="text"
                        autoComplete="off"
                        maxLength={MAX_MESSAGE}
                        placeholder={t(submitted ? 'chat.notePlaceholder' : 'chat.placeholder')}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                    />
                    <button type="submit" className="lc-send" disabled={!draft.trim() || waiting} aria-label={t('chat.send')}>
                        <FaPaperPlane aria-hidden="true" />
                    </button>
                    <div className="lc-input__actions">
                        <button type="button" className="lq-inline-link lc-privacy" onClick={() => setShowPrivacy(true)}>
                            {t('chat.privacyLink')}
                        </button>
                    </div>
                </form>
            )}
            {showPrivacy && <PrivacyPolicyModal onClose={hidePrivacy} />}
        </section>
    );
}
