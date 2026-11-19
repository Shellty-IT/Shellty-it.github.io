import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { FaPaperPlane, FaTimes } from 'react-icons/fa';
import {
    CHAT_NODES,
    CHAT_START,
    OPEN_QUALIFIER,
    WRITE_TO_TOMEK,
    matchTopic,
    nodeReplies,
    pageKey,
    replyTarget,
} from '../../leads/chatScenario';
import { loadLeadSession, updateLeadSession } from '../../leads/leadSession';
import { sendChatMessage, submitLead, submitLeadNote } from '../../leads/leadApi';
import { markLeadSent, qualifierAnswers, qualifierSummary, sentLead, summaryText } from '../../leads/funnelContext';
import { trackEvent } from '../../leads/funnelEvents';
import PrivacyPolicyModal from '../contact/PrivacyPolicyModal';
import avatarSmall from '../../assets/avatar/tomek_small.webp';
import { BotTurn, TypingIndicator, UserMessage, scrollToTurn } from '../leadQualifier/Chat';
import ContactStep from '../leadQualifier/ContactStep';
import '../leadQualifier/QualifierModal.css';

const TYPING_DELAY_MS = 700;
const REDUCED_TYPING_DELAY_MS = 150;
const PREVIOUS_REPLY_OFFSET = 72;
const MAX_MESSAGE = 500;
const MAX_SUMMARY = 2000;
const MAX_ASSISTANT_CONTEXT = 1000;
const HISTORY_LIMIT = 16;
const AI_SERVICES = ['website', 'app', 'fixes', 'it'];

function prefersReducedMotion() {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function initialState(pathname) {
    const saved = loadLeadSession().chat;
    return Array.isArray(saved?.turns) && saved.turns.length > 0
        ? saved
        : { turns: [{ from: 'bot', node: CHAT_START, page: pageKey(pathname) }], service: null, note: '' };
}

function chatSummary(turns) {
    return turns
        .filter((turn) => turn.from === 'user')
        .map((turn) => turn.text)
        .join(' → ')
        .slice(0, MAX_SUMMARY);
}

function nodeMessages(t, turn) {
    const key = `chat.nodes.${turn.node}.messages`;
    const count = t(key, { returnObjects: true }).length;
    const messages = Array.from({ length: count }, (_, index) => t(`${key}.${index}`));
    if (turn.node === CHAT_START) return [t(`chat.greetings.${turn.page}`), ...messages];
    return messages;
}

function assistantHistory(t, turns, text) {
    const history = turns.flatMap((turn) => {
        if (turn.from === 'user') return [{ role: 'user', content: turn.text }];
        const content = turn.ai ? turn.ai.reply : nodeMessages(t, turn).join(' ');
        return content ? [{ role: 'assistant', content: content.slice(0, MAX_ASSISTANT_CONTEXT) }] : [];
    });
    return [...history, { role: 'user', content: text }].slice(-HISTORY_LIMIT);
}

function AnswersCard({ rows }) {
    return (
        <dl className="lq-card lq-summary">
            {rows.map(({ label, value }) => (
                <div key={label} className="lq-summary__row">
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                </div>
            ))}
        </dl>
    );
}

export default function ChatWindow({ open = true, onClose, onOpenQualifier }) {
    const { t, i18n } = useTranslation();
    const { pathname } = useLocation();
    const [state, setState] = useState(() => initialState(pathname));
    const [draft, setDraft] = useState('');
    const [waiting, setWaiting] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const hidePrivacy = useCallback(() => setShowPrivacy(false), []);
    const inputRef = useRef(null);
    const logRef = useRef(null);
    const currentTurnRef = useRef(null);
    const promptRef = useRef(null);

    const { turns, service, note, submitted } = state;
    const lastIndex = turns.length - 1;
    const current = turns[lastIndex];
    const showingContact = current.ai?.action === 'show_contact_card' || CHAT_NODES[current.node]?.contact;
    const lang = i18n.language === 'en' ? 'en' : 'pl';
    const [revealedIndex, setRevealedIndex] = useState(lastIndex - 1);
    const typing = revealedIndex < lastIndex;

    useEffect(() => {
        updateLeadSession({ chat: state });
    }, [state]);

    useEffect(() => {
        if (!open) {
            setDraft('');
            setShowPrivacy(false);
            return;
        }
        inputRef.current?.focus();
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const rows = qualifierSummary(t, qualifierAnswers());
        const summary = summaryText(rows);
        const hasSentLead = Boolean(sentLead());
        setState((previous) => {
            const withContext = summary && previous.qualifierSeen !== summary
                ? { ...previous, qualifierSeen: summary, turns: [...previous.turns, { from: 'bot', node: 'fromQualifier', rows }] }
                : previous;
            return hasSentLead && !withContext.submitted ? { ...withContext, submitted: true } : withContext;
        });
    }, [open, t]);

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
        if (document.activeElement !== inputRef.current) promptRef.current?.focus({ preventScroll: true });
        scrollToTurn(logRef.current, currentTurnRef.current, PREVIOUS_REPLY_OFFSET, behavior);
    }, [open, typing, waiting, lastIndex]);

    const addTurns = useCallback((userText, node, patch = {}) => {
        setState((previous) => ({
            ...previous,
            ...patch,
            service: CHAT_NODES[node].service ?? previous.service,
            turns: [...previous.turns, { from: 'user', text: userText }, { from: 'bot', node }],
        }));
    }, []);

    const askAssistant = async (text) => {
        const messages = assistantHistory(t, turns, text);
        setState((previous) => ({ ...previous, note: text, turns: [...previous.turns, { from: 'user', text }] }));
        setWaiting(true);
        trackEvent('chat_message');

        let answer = null;
        try {
            const context = summaryText(qualifierSummary(t, qualifierAnswers()));
            const result = await sendChatMessage({ messages, lang, page: pathname, context });
            if (!result.fallback) answer = result;
        } catch {}
        setWaiting(false);

        setState((previous) => {
            if (!answer) {
                const node = matchTopic(text);
                return {
                    ...previous,
                    service: CHAT_NODES[node].service ?? previous.service,
                    turns: [...previous.turns, { from: 'bot', node }],
                };
            }
            const signalled = answer.signals?.service;
            return {
                ...previous,
                service: AI_SERVICES.includes(signalled) ? signalled : previous.service,
                turns: [
                    ...previous.turns,
                    {
                        from: 'bot',
                        ai: {
                            reply: answer.reply,
                            quickReplies: answer.quickReplies ?? [],
                            action: answer.action ?? 'none',
                        },
                    },
                ],
            };
        });
    };

    const chooseReply = (reply) => {
        if (reply === OPEN_QUALIFIER) {
            onOpenQualifier();
            return;
        }
        if (reply === WRITE_TO_TOMEK) {
            setDraft('');
            addTurns(t(`chat.replies.${reply}`), replyTarget(reply), { note: draft.trim() });
            return;
        }
        addTurns(t(`chat.replies.${reply}`), replyTarget(reply));
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
            addTurns(text, 'noted');
        } catch {
            addTurns(text, 'noteFailed');
        }
    };

    const sendLead = async (contact) => {
        await submitLead({
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            consent: contact.consent,
            consentText: contact.consentText,
            fax: contact.fax,
            source: 'chat',
            page: pathname,
            lang,
            answers: { ...(service && { service }), ...qualifierAnswers(), ...contact.answers },
            chatSummary: chatSummary(turns),
        });
        markLeadSent(contact.name);
        trackEvent('lead_submitted', { source: 'chat' });
        setState((previous) => ({
            ...previous,
            submitted: true,
            turns: [
                ...previous.turns,
                { from: 'user', text: t('qualifier.chat.contactSent') },
                { from: 'bot', node: 'thanks' },
            ],
        }));
    };

    const renderContactCard = (variant, initialNote) => (
        <ContactStep
            key={lastIndex}
            variant={variant}
            initialNote={initialNote}
            onSubmit={sendLead}
            onShowPrivacy={() => setShowPrivacy(true)}
        />
    );

    const renderReplyButtons = (buttons) => (
        <div className="lc-replies">
            {buttons.map(({ key, label, accent, onClick }) => (
                <button
                    key={key}
                    type="button"
                    className={`lc-reply${accent ? ' lc-reply--accent' : ''}`}
                    onClick={onClick}
                >
                    {label}
                </button>
            ))}
        </div>
    );

    const scriptedButton = (reply) => ({
        key: reply,
        label: t(`chat.replies.${reply}`),
        accent: reply === OPEN_QUALIFIER,
        onClick: () => chooseReply(reply),
    });

    const renderCurrentActions = () => {
        if (current.ai) {
            const { quickReplies, action } = current.ai;
            if (action === 'show_contact_card' && !submitted) return renderContactCard('chat', '');
            const suggestions = action.startsWith('show_project:') ? [] : quickReplies;
            return renderReplyButtons([
                ...suggestions.map((label) => ({ key: `ai-${label}`, label, onClick: () => askAssistant(label) })),
                ...(action === 'open_qualifier' ? [scriptedButton(OPEN_QUALIFIER)] : []),
            ]);
        }
        const config = CHAT_NODES[current.node];
        if (config.contact && !submitted) {
            return renderContactCard(config.contact, ['contact', 'unknown'].includes(current.node) ? note : '');
        }
        const replies = nodeReplies(current.node).filter(
            (reply) => reply !== WRITE_TO_TOMEK && (!submitted || replyTarget(reply) !== 'contact')
        );
        return replies.length > 0 ? renderReplyButtons(replies.map(scriptedButton)) : null;
    };

    const renderBotTurn = (turn, isCurrent) => {
        const showActions = isCurrent && !waiting;
        if (turn.ai) {
            return (
                <BotTurn ref={isCurrent ? promptRef : undefined} focusable={isCurrent} messages={[turn.ai.reply]}>
                    {showActions && renderCurrentActions()}
                </BotTurn>
            );
        }
        const after = t(`chat.nodes.${turn.node}.after`, { defaultValue: '' });
        const steps = CHAT_NODES[turn.node].process
            ? t('chat.nodes.process.steps', { returnObjects: true, defaultValue: [] })
            : [];
        return (
            <BotTurn ref={isCurrent ? promptRef : undefined} focusable={isCurrent} messages={nodeMessages(t, turn)}>
                {turn.rows && <AnswersCard rows={turn.rows} />}
                {Array.isArray(steps) && steps.length > 0 && (
                    <ol className="lq-card lq-process lc-process">
                        {steps.map((step) => (
                            <li key={step}>{step}</li>
                        ))}
                    </ol>
                )}
                {after && <p className="lq-bubble">{after}</p>}
                {showActions && renderCurrentActions()}
            </BotTurn>
        );
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
                            {renderBotTurn(turn, isCurrent)}
                        </div>
                    );
                })}
                {waiting && <TypingIndicator key="waiting" />}
            </div>

            <form className="lc-input" onSubmit={sendMessage}>
                <label className="lq-visually-hidden" htmlFor="lc-message">{t('chat.inputLabel')}</label>
                <input
                    ref={inputRef}
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
                    {!submitted && !showingContact && (
                        <button type="button" className="lc-reply lc-reply--accent" disabled={waiting} onClick={() => chooseReply(WRITE_TO_TOMEK)}>
                            {t(`chat.replies.${WRITE_TO_TOMEK}`)}
                        </button>
                    )}
                    <button type="button" className="lq-inline-link lc-privacy" onClick={() => setShowPrivacy(true)}>
                        {t('chat.privacyLink')}
                    </button>
                </div>
            </form>
            {showPrivacy && <PrivacyPolicyModal onClose={hidePrivacy} />}
        </section>
    );
}
