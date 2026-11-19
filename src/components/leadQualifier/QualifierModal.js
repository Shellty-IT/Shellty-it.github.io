import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { BotTurn, TypingIndicator, UserMessage } from './Chat';
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

    const { history, answers, submitted } = state;
    const currentIndex = history.length - 1;
    const stepId = history[currentIndex];
    const relevant = relevantAnswers(history, answers);
    const stepProgress = progress(history, answers);
    const isQuestion = isQuestionStep(stepId);
    const canGoBack = history.length > 1 && !submitted;
    const previousReply = currentIndex > 0 ? userReply(t, history, currentIndex - 1, answers) : '';
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
    const showPlan = isQuestion || history.includes('diagnosis');
    const diagnosis = stepId === 'diagnosis' ? buildDiagnosis(relevant) : null;
    const [revealedIndex, setRevealedIndex] = useState(currentIndex - 1);
    const typing = revealedIndex < currentIndex;

    useEffect(() => {
        updateLeadSession({ qualifier: submitted ? null : state });
        saveQualifierAnswers(relevantAnswers(state.history, state.answers));
    }, [state, submitted]);

    useEffect(() => {
        dialogRef.current?.focus();
    }, []);

    useEffect(() => {
        if (isQuestionStep(stepId)) trackEvent('qualifier_step', { step: stepId, index: currentIndex + 1 });
        if (stepId === 'diagnosis') trackEvent('qualifier_value_view');
    }, [stepId, currentIndex]);

    useEffect(() => {
        if (revealedIndex > currentIndex) {
            setRevealedIndex(currentIndex);
            return undefined;
        }
        if (revealedIndex === currentIndex) return undefined;
        const delay = prefersReducedMotion() ? REDUCED_TYPING_DELAY_MS : TYPING_DELAY_MS;
        const timer = setTimeout(() => setRevealedIndex(currentIndex), delay);
        return () => clearTimeout(timer);
    }, [currentIndex, revealedIndex]);

    useEffect(() => {
        chatRef.current?.scrollTo?.({ top: 0 });
        if (!typing) promptRef.current?.focus({ preventScroll: true });
    }, [typing, currentIndex]);

    const close = useCallback(() => {
        const savedMidway = !submitted && history.length > 1;
        if (savedMidway) trackEvent('qualifier_closed_midway', { step: stepId });
        onClose({ savedMidway });
    }, [onClose, submitted, history.length, stepId]);

    useDialog(dialogRef, close, !showPrivacy);

    const hidePrivacy = useCallback(() => setShowPrivacy(false), []);

    const goTo = (next, patch = {}) => {
        if (next === ASK_QUESTION) {
            onAskQuestion();
            return;
        }
        setState((current) => ({
            ...current,
            answers: { ...current.answers, ...patch },
            history: [...current.history, next],
        }));
    };

    const answer = (value, extra = {}) => {
        const patch = { ...extra, [stepId]: value };
        goTo(nextStep(stepId, { ...answers, ...patch }), patch);
    };

    const back = () => {
        setState((current) => ({ ...current, history: current.history.slice(0, -1) }));
    };

    const sendLead = async (contact) => {
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
    };

    const acceptProposal = async () => {
        trackEvent('qualifier_yes');
        const nextContactStep = diagnosis.isShort ? 'soft' : 'contact';
        const existingLead = sentLead();
        if (!existingLead) {
            goTo(nextContactStep);
            return;
        }
        const note = `${t('qualifier.noteIntro')} ${summaryText(qualifierSummary(t, relevant))}`.slice(0, MAX_NOTE);
        try {
            await submitLeadNote(note);
            setState((current) => ({
                ...current,
                submitted: { name: existingLead.name, variant: 'noted' },
                history: [...current.history, 'thanks'],
            }));
        } catch {
            goTo(nextContactStep);
        }
    };

    const renderReplies = () => {
        if (isQuestionStep(stepId)) {
            return <TileStep key={stepId} stepId={stepId} answers={answers} onAnswer={answer} />;
        }
        if (stepId === 'diagnosis') return <DiagnosisStep diagnosis={diagnosis} />;
        if (stepId === 'thanks') {
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
                className="lq-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="lq-chat-title"
                tabIndex={-1}
            >
                <QualifierRail
                    notes={notes}
                    plan={showPlan ? { answered: answeredCount, total: path.length } : null}
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
                        {previousReply && <UserMessage>{previousReply}</UserMessage>}
                        {typing ? (
                            <TypingIndicator />
                        ) : (
                            <div key={`${currentIndex}-${stepId}`} className="lq-turn">
                                <BotTurn
                                    ref={promptRef}
                                    focusable
                                    ask={isQuestion}
                                    messages={botMessages(t, history, currentIndex, answers, submitted)}
                                >
                                    {renderReplies()}
                                </BotTurn>
                            </div>
                        )}
                    </div>

                    {(canGoBack || isQuestion) && (
                        <div className="lq-dialog__footer">
                            {canGoBack && (
                                <button type="button" className="lq-back" onClick={back}>
                                    <FaArrowLeft aria-hidden="true" /> {t('qualifier.back')}
                                </button>
                            )}
                            {isQuestion && (
                                <button type="button" className="lq-own-words" onClick={onAskQuestion}>
                                    {t('qualifier.ownWords')}
                                </button>
                            )}
                            {diagnosis && !typing && !diagnosis.isShort && (
                                <button type="button" className="lq-own-words" onClick={onAskQuestion}>
                                    {t('qualifier.diagnosis.question')}
                                </button>
                            )}
                            {diagnosis && !typing && (
                                <button type="button" className="lq-primary lq-dialog__cta" onClick={acceptProposal}>
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
