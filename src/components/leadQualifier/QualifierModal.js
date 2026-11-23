import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { FaArrowLeft, FaTimes } from 'react-icons/fa';
import avatar from '../../assets/avatar/tomek_small.webp';
import { CONTACT_STEP } from '../../leads/qualifierConfig';
import { conversationSteps, isQuestionStep, relevantAnswers } from '../../leads/qualifierEngine';
import { loadLeadSession, updateLeadSession } from '../../leads/leadSession';
import { submitLead, submitLeadNote } from '../../leads/leadApi';
import { chatService, markLeadSent, qualifierSummary, sentLead, summaryText } from '../../leads/funnelContext';
import { trackEvent } from '../../leads/funnelEvents';
import PrivacyPolicyModal from '../contact/PrivacyPolicyModal';
import { BotTurn, TypingIndicator, UserMessage, scrollToTurn } from './Chat';
import { submitErrorMessage } from './ContactStep';
import PhoneStep from './PhoneStep';
import TileStep from './TileStep';
import './QualifierModal.css';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';
const TYPING_DELAY_MS = 600;
const REDUCED_TYPING_DELAY_MS = 150;
const THANKS_STEP = 'thanks';

function prefersReducedMotion() {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function loadAnswers() {
    const saved = loadLeadSession().qualifier?.answers;
    if (saved) return relevantAnswers(saved);
    const service = chatService();
    return service ? { service } : {};
}

function useDialog(dialogRef, onEscape, active) {
    useEffect(() => {
        if (!active) return undefined;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onEscape();
                return;
            }
            if (event.key !== 'Tab') return;
            const focusables = dialogRef.current?.querySelectorAll(FOCUSABLE);
            if (!focusables?.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [dialogRef, onEscape, active]);
}

function NoteStep({ onSubmit }) {
    const { t } = useTranslation();
    const [status, setStatus] = useState({ sending: false, error: '' });

    const send = async () => {
        setStatus({ sending: true, error: '' });
        try {
            await onSubmit();
        } catch (error) {
            setStatus({ sending: false, error: submitErrorMessage(error, t) });
        }
    };

    return (
        <div className="lq-phone-form">
            <button type="button" className="lq-primary" onClick={send} disabled={status.sending} aria-busy={status.sending}>
                {status.sending ? t('qualifier.contact.sending') : t('qualifier.thanks.sendNote')}
            </button>
            <p className="lq-form-status" role="alert">{status.error}</p>
        </div>
    );
}

export default function QualifierModal({ onClose }) {
    const { t, i18n } = useTranslation();
    const { pathname } = useLocation();
    const dialogRef = useRef(null);
    const chatRef = useRef(null);
    const promptRef = useRef(null);
    const [answers, setAnswers] = useState(loadAnswers);
    const [submitted, setSubmitted] = useState(null);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [noteOnly] = useState(() => Boolean(sentLead()));

    const steps = conversationSteps(answers);
    const turns = submitted ? [...steps, THANKS_STEP] : steps;
    const [revealed, setRevealed] = useState(turns.length);
    const visible = Math.min(revealed, turns.length);
    const typing = visible < turns.length;
    const currentStep = turns[visible - 1];
    const lastStep = turns[turns.length - 1];
    const emergency = answers.service === 'emergency';

    const close = useCallback(() => {
        const savedMidway = !submitted && Object.keys(answers).length > 0;
        if (savedMidway) trackEvent('qualifier_closed_midway', { step: lastStep });
        onClose({ savedMidway });
    }, [onClose, submitted, answers, lastStep]);

    useDialog(dialogRef, close, !showPrivacy);

    useEffect(() => {
        updateLeadSession({ qualifier: submitted ? null : { answers }, qualifierAnswers: answers });
    }, [answers, submitted]);

    useEffect(() => {
        if (!typing) return undefined;
        const delay = prefersReducedMotion() ? REDUCED_TYPING_DELAY_MS : TYPING_DELAY_MS;
        const timer = setTimeout(() => setRevealed(turns.length), delay);
        return () => clearTimeout(timer);
    }, [typing, turns.length]);

    useEffect(() => {
        if (!typing && currentStep !== THANKS_STEP) {
            trackEvent('qualifier_step', { step: currentStep, index: visible });
        }
    }, [typing, currentStep, visible]);

    useLayoutEffect(() => {
        const chat = chatRef.current;
        scrollToTurn(chat, chat.lastElementChild, 12, prefersReducedMotion() ? 'auto' : 'smooth');
        if (!typing && currentStep !== CONTACT_STEP) promptRef.current?.focus({ preventScroll: true });
    }, [typing, currentStep]);

    const answer = (stepId, value) => {
        setAnswers((current) => ({ ...relevantAnswers(current), [stepId]: value }));
    };

    const back = () => {
        const previous = steps[steps.length - 2];
        setAnswers((current) => {
            const { [previous]: removed, ...rest } = relevantAnswers(current);
            return rest;
        });
        setRevealed(steps.length - 1);
    };

    const sendLead = async ({ display, ...contact }) => {
        await submitLead({
            ...contact,
            name: '',
            source: 'qualifier',
            page: pathname,
            lang: i18n.language === 'en' ? 'en' : 'pl',
            answers,
        });
        markLeadSent('');
        trackEvent('lead_submitted', { source: 'qualifier', variant: emergency ? 'emergency' : 'contact' });
        setSubmitted({ variant: emergency ? 'emergency' : 'contact', reply: display });
    };

    const sendNote = async () => {
        await submitLeadNote(`${t('qualifier.noteIntro')} ${summaryText(qualifierSummary(t, answers))}`);
        setSubmitted({ variant: 'noted', reply: t('qualifier.thanks.sendNote') });
    };

    const answerLabel = (stepId) => {
        if (isQuestionStep(stepId)) return t(`qualifier.steps.${stepId}.options.${answers[stepId]}.label`);
        return submitted?.reply ?? '';
    };

    const botMessages = (stepId, index) => {
        const previous = turns[index - 1];
        const reaction = isQuestionStep(previous)
            ? t(`qualifier.steps.${previous}.options.${answers[previous]}.reaction`, { defaultValue: '' })
            : '';
        if (index === 0) return [t('qualifier.chat.intro'), t('qualifier.steps.service.prompt')];
        if (isQuestionStep(stepId)) return [reaction, t(`qualifier.steps.${stepId}.prompt`)];
        if (stepId === CONTACT_STEP) {
            const variant = noteOnly ? 'noted' : emergency ? 'emergency' : 'contact';
            return [reaction, t(`qualifier.phone.prompt.${variant}`)];
        }
        return [t('qualifier.thanks.title'), t(`qualifier.thanks.text.${submitted.variant}`)];
    };

    const renderAction = (stepId) => {
        if (isQuestionStep(stepId)) return <TileStep stepId={stepId} onAnswer={(value) => answer(stepId, value)} />;
        if (stepId === THANKS_STEP) {
            return (
                <button type="button" className="lq-secondary" onClick={close}>
                    {t('qualifier.thanks.close')}
                </button>
            );
        }
        if (noteOnly) return <NoteStep onSubmit={sendNote} />;
        return (
            <PhoneStep
                allowEmail={!emergency}
                onSubmit={sendLead}
                onShowPrivacy={() => setShowPrivacy(true)}
            />
        );
    };

    return createPortal(
        <div className="lq-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
            <div ref={dialogRef} className="lq-dialog" role="dialog" aria-modal="true" aria-labelledby="lq-title" tabIndex={-1}>
                <header className="lq-head">
                    <img className="lq-head__avatar" src={avatar} alt="" width="44" height="44" />
                    <div className="lq-head__who">
                        <h2 id="lq-title" className="lq-head__name">{t('qualifier.rail.name')}</h2>
                        <p className="lq-head__status">{t('qualifier.rail.status')}</p>
                    </div>
                    <button type="button" className="lq-icon-btn" onClick={close} aria-label={t('qualifier.close')}>
                        <FaTimes aria-hidden="true" />
                    </button>
                </header>

                <div ref={chatRef} className="lq-chat" role="log" aria-label={t('qualifier.chat.title')}>
                    {turns.slice(0, visible + 1).map((stepId, index) => {
                        const current = index === visible - 1;
                        return (
                            <div key={stepId} className="lq-exchange">
                                {index > 0 && <UserMessage>{answerLabel(turns[index - 1])}</UserMessage>}
                                {index === visible ? <TypingIndicator /> : (
                                    <div className={current ? 'lq-turn' : undefined}>
                                        <BotTurn
                                            ref={current ? promptRef : undefined}
                                            focusable={current}
                                            ask={stepId !== THANKS_STEP}
                                            messages={botMessages(stepId, index)}
                                        >
                                            {current && !typing && renderAction(stepId)}
                                            {current && !typing && index > 0 && stepId !== THANKS_STEP && (
                                                <button type="button" className="lq-back" onClick={back}>
                                                    <FaArrowLeft aria-hidden="true" /> {t('qualifier.back')}
                                                </button>
                                            )}
                                        </BotTurn>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}
        </div>,
        document.body
    );
}
