import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { FaArrowLeft, FaThumbsUp, FaTimes } from 'react-icons/fa';
import { ASK_QUESTION, QUESTION_STEPS } from '../../leads/qualifierConfig';
import {
    INITIAL_STATE,
    buildDiagnosis,
    isQuestionStep,
    nextStep,
    progress,
    questionPath,
    relevantAnswers,
} from '../../leads/qualifierEngine';
import { loadLeadSession, updateLeadSession } from '../../leads/leadSession';
import { submitLead, submitLeadNote } from '../../leads/leadApi';
import {
    chatService,
    markLeadSent,
    qualifierSummary,
    saveQualifierAnswers,
    sentLead,
    summaryText,
} from '../../leads/funnelContext';
import { trackEvent } from '../../leads/funnelEvents';
import PrivacyPolicyModal from '../contact/PrivacyPolicyModal';
import { BotTurn, TypingIndicator, UserMessage, scrollToTurn } from './Chat';
import QualifierRail from './QualifierRail';
import TileStep from './TileStep';
import DiagnosisStep from './DiagnosisStep';
import ContactStep from './ContactStep';
import ThanksStep from './ThanksStep';
import './QualifierModal.css';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';
const TYPING_DELAY_MS = 700;
const REDUCED_TYPING_DELAY_MS = 150;

const MAX_NOTE = 1000;

function loadQualifierState() {
    const saved = loadLeadSession().qualifier;
    if (Array.isArray(saved?.history) && saved.history.length > 0) return saved;
    const service = chatService();
    if (!service) return INITIAL_STATE;
    const answers = { service };
    return { history: [...INITIAL_STATE.history, nextStep(INITIAL_STATE.history[0], answers)], answers };
}

function prefersReducedMotion() {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
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

function reactionTo(t, stepId, answers) {
    const value = answers[stepId];
    if (!isQuestionStep(stepId) || value === undefined) return '';
    const [first] = [].concat(value);
    return t(`qualifier.steps.${stepId}.options.${first}.reaction`, { defaultValue: '' });
}

function botMessages(t, history, index, answers, submitted) {
    const stepId = history[index];
    const reaction = index > 0 ? reactionTo(t, history[index - 1], answers) : '';
    if (isQuestionStep(stepId)) {
        return [index === 0 ? t('qualifier.chat.intro') : reaction, t(`qualifier.steps.${stepId}.prompt`)];
    }
    if (stepId === 'diagnosis') return [reaction];
    if (stepId === 'thanks') {
        return [
            t('qualifier.thanks.title', { name: submitted?.name, context: submitted?.name ? undefined : 'anonymous' }),
            t(`qualifier.thanks.text.${submitted?.variant}`),
        ];
    }
    return [reaction, t(`qualifier.contact.${stepId}.title`), t(`qualifier.contact.${stepId}.lead`)];
}

function userReply(t, history, index, answers) {
    const stepId = history[index];
    if (isQuestionStep(stepId)) {
        const labels = [].concat(answers[stepId]).map(
            (value) => t(`qualifier.steps.${stepId}.options.${value}.label`)
        );
        if (QUESTION_STEPS[stepId].withSiteUrl && answers.siteUrl) labels.push(answers.siteUrl);
        return labels.join(', ');
    }
    if (stepId === 'diagnosis') {
        return history[index + 1] === 'soft' ? t('qualifier.diagnosis.softCta') : t('qualifier.diagnosis.yes');
    }
    if (stepId === 'thanks') return '';
    return t('qualifier.chat.contactSent');
}

export default function QualifierModal({ onClose, onAskQuestion }) {
    const { t, i18n } = useTranslation();
    const { pathname } = useLocation();
    const dialogRef = useRef(null);
    const chatRef = useRef(null);
    const promptRef = useRef(null);
    const [state, setState] = useState(loadQualifierState);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const { history, answers, submitted } = state;
    const currentIndex = history.length - 1;
    const stepId = history[currentIndex];
    const relevant = relevantAnswers(history, answers);
    const stepProgress = progress(history, answers);
    const isQuestion = isQuestionStep(stepId);
    const isDiagnosis = stepId === 'diagnosis';
    const isContact = !isQuestion && !isDiagnosis && stepId !== 'thanks';
    const canGoBack = history.length > 1 && !submitted;
    const path = questionPath(relevant);
    const answeredCount = history.filter(isQuestionStep).length - (isQuestion ? 1 : 0);
    const notes = path.map((noteStep, index) => {
        const answered = index < answeredCount;
        return {
            id: noteStep,
            label: answered
                ? userReply(t, history, history.indexOf(noteStep), answers)
                : t(`qualifier.steps.${noteStep}.summary`),
            state: answered ? 'done' : noteStep === stepId ? 'current' : '',
        };
    });
    const diagnosis = history.includes('diagnosis') ? buildDiagnosis(relevant) : null;
    const [revealedIndex, setRevealedIndex] = useState(currentIndex - 1);
    const typing = !isContact && revealedIndex < currentIndex;

    useEffect(() => {
        updateLeadSession({ qualifier: submitted ? null : state });
        saveQualifierAnswers(relevantAnswers(state.history, state.answers));
    }, [state, submitted]);

    useEffect(() => {
        if (isQuestionStep(stepId)) trackEvent('qualifier_step', { step: stepId, index: currentIndex + 1 });
        if (stepId === 'diagnosis') trackEvent('qualifier_value_view');
    }, [stepId, currentIndex]);

    useEffect(() => {
        if (revealedIndex > currentIndex) {
            setRevealedIndex(currentIndex);
            return undefined;
        }
        if (!typing) return undefined;
        const delay = prefersReducedMotion() ? REDUCED_TYPING_DELAY_MS : TYPING_DELAY_MS;
        const timer = setTimeout(() => setRevealedIndex(currentIndex), delay);
        return () => clearTimeout(timer);
    }, [currentIndex, revealedIndex, typing]);

    useLayoutEffect(() => {
        const chat = chatRef.current;
        if (isContact) {
            chat.scrollTop = chat.scrollHeight;
        } else {
            scrollToTurn(chat, chat.lastElementChild, chat.firstElementChild.offsetTop, 'instant');
        }
        const focusTarget = (!typing && promptRef.current) || dialogRef.current;
        focusTarget.focus({ preventScroll: true });
    }, [typing, currentIndex, isContact, stepId]);

    const close = useCallback(() => {
        const savedMidway = !submitted && history.length > 1;
        if (savedMidway) trackEvent('qualifier_closed_midway', { step: stepId });
        onClose({ savedMidway });
    }, [onClose, submitted, history.length, stepId]);

    useDialog(dialogRef, close, !showPrivacy);

    const hidePrivacy = useCallback(() => setShowPrivacy(false), []);

    const openContact = (next) => {
        setState((current) => ({
            ...current,
            history: [...current.history, next],
        }));
    };

    const answer = (index, value, extra = {}) => {
        if (submitting || submitted) return;
        const question = history[index];
        const editing = index < currentIndex;
        if (editing) {
            const saved = [].concat(answers[question]);
            const selected = [].concat(value);
            const sameUrl = extra.siteUrl === undefined || extra.siteUrl === (answers.siteUrl ?? '');
            if (sameUrl && saved.length === selected.length && saved.every((id, i) => id === selected[i])) return;
        }

        const nextHistory = history.slice(0, index + 1);
        const nextAnswers = {
            ...(editing ? relevantAnswers(nextHistory, answers) : answers),
            ...extra,
            [question]: value,
        };
        const next = nextStep(question, nextAnswers);
        if (next === ASK_QUESTION) {
            onAskQuestion();
            return;
        }
        setRevealedIndex(index);
        setState({ history: [...nextHistory, next], answers: nextAnswers });
    };

    const back = () => {
        setState((current) => ({ ...current, history: current.history.slice(0, -1) }));
    };

    const sendLead = async (contact) => {
        setSubmitting(true);
        try {
            await submitLead({
                name: contact.name,
                phone: contact.phone,
                email: contact.email,
                consent: contact.consent,
                consentText: contact.consentText,
                fax: contact.fax,
                source: 'qualifier',
                page: pathname,
                lang: i18n.language === 'en' ? 'en' : 'pl',
                answers: { ...relevant, ...contact.answers },
            });
            markLeadSent(contact.name);
            trackEvent('lead_submitted', { source: 'qualifier', variant: stepId });
            setState((current) => ({
                ...current,
                submitted: { name: contact.name, variant: stepId },
                history: [...current.history, 'thanks'],
            }));
        } finally {
            setSubmitting(false);
        }
    };

    const acceptProposal = async () => {
        trackEvent('qualifier_yes');
        const nextContactStep = diagnosis.isShort ? 'soft' : 'contact';
        const existingLead = sentLead();
        if (!existingLead) {
            openContact(nextContactStep);
            return;
        }
        const note = `${t('qualifier.noteIntro')} ${summaryText(qualifierSummary(t, relevant))}`.slice(0, MAX_NOTE);
        setSubmitting(true);
        try {
            await submitLeadNote(note);
            setState((current) => ({
                ...current,
                submitted: { name: existingLead.name, variant: 'noted' },
                history: [...current.history, 'thanks'],
            }));
        } catch {
            openContact(nextContactStep);
        } finally {
            setSubmitting(false);
        }
    };

    const renderStep = (turnStep, index) => {
        const current = index === currentIndex;
        if (isQuestionStep(turnStep)) {
            return (
                <TileStep
                    key={current ? 'current' : 'history'}
                    stepId={turnStep}
                    answers={answers}
                    disabled={submitting || Boolean(submitted)}
                    onAnswer={(value, extra) => answer(index, value, extra)}
                />
            );
        }
        if (turnStep === 'diagnosis') return <DiagnosisStep diagnosis={diagnosis} />;
        if (!current) return null;
        if (turnStep === 'thanks') {
            return <ThanksStep variant={submitted?.variant} answers={relevant} onClose={close} />;
        }
        return (
            <ContactStep
                key={stepId}
                variant={stepId}
                onSubmit={sendLead}
                onShowPrivacy={() => setShowPrivacy(true)}
            />
        );
    };

    return createPortal(
        <div
            className="lq-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) close();
            }}
        >
            <div
                ref={dialogRef}
                className={isContact ? 'lq-dialog lq-dialog--contact' : 'lq-dialog'}
                role="dialog"
                aria-modal="true"
                aria-labelledby="lq-chat-title"
                tabIndex={-1}
            >
                <QualifierRail
                    notes={notes}
                    plan={isQuestion || diagnosis ? { answered: answeredCount, total: path.length } : null}
                />
                <div className="lq-main">
                    <div className="lq-dialog__top">
                        <h2 id="lq-chat-title" className="lq-dialog__title">{t('qualifier.chat.title')}</h2>
                        {stepProgress && (
                            <span className="lq-dialog__step">{t('qualifier.stepOf', stepProgress)}</span>
                        )}
                        <button
                            type="button"
                            className="lq-icon-btn"
                            onClick={close}
                            aria-label={t('qualifier.close')}
                        >
                            <FaTimes aria-hidden="true" />
                        </button>
                    </div>

                    <div ref={chatRef} className="lq-chat" role="log" aria-labelledby="lq-chat-title">
                        {history.map((turnStep, index) => {
                            const current = index === currentIndex;
                            const contact = current && isContact;
                            const reply = index > 0 ? userReply(t, history, index - 1, answers) : '';
                            const className = 'lq-exchange'
                                + (current ? ' lq-exchange--current' : '')
                                + (contact ? ' lq-exchange--contact' : '');
                            return (
                                <div key={`${index}-${turnStep}`} className={className}>
                                    {reply && <UserMessage>{reply}</UserMessage>}
                                    {current && typing ? <TypingIndicator /> : (
                                        <div className={current ? 'lq-turn' : undefined}>
                                            <BotTurn
                                                ref={current ? promptRef : undefined}
                                                focusable={current}
                                                ask={isQuestionStep(turnStep)}
                                                messages={botMessages(t, history, index, answers, submitted)}
                                            >
                                                {renderStep(turnStep, index)}
                                            </BotTurn>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {(canGoBack || isQuestion) && (
                        <div className="lq-dialog__footer">
                            {canGoBack && (
                                <button type="button" className="lq-back" onClick={back} disabled={submitting}>
                                    <FaArrowLeft aria-hidden="true" /> {t('qualifier.back')}
                                </button>
                            )}
                            {isQuestion && (
                                <button type="button" className="lq-own-words" onClick={onAskQuestion}>
                                    {t('qualifier.ownWords')}
                                </button>
                            )}
                            {isDiagnosis && !typing && !diagnosis.isShort && (
                                <button type="button" className="lq-own-words" onClick={onAskQuestion}>
                                    {t('qualifier.diagnosis.question')}
                                </button>
                            )}
                            {isDiagnosis && !typing && (
                                <button
                                    type="button"
                                    className="lq-primary lq-dialog__cta"
                                    onClick={acceptProposal}
                                    disabled={submitting}
                                >
                                    <FaThumbsUp aria-hidden="true" />
                                    {t(diagnosis.isShort ? 'qualifier.diagnosis.softCta' : 'qualifier.diagnosis.yes')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {showPrivacy && <PrivacyPolicyModal onClose={hidePrivacy} />}
        </div>,
        document.body
    );
}
