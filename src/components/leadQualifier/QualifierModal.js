import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { FaArrowLeft, FaTimes } from 'react-icons/fa';
import { relevantAnswers } from '../../leads/qualifierEngine';
import { loadLeadSession, updateLeadSession } from '../../leads/leadSession';
import { submitLead, submitLeadNote } from '../../leads/leadApi';
import { chatService, markLeadSent, sentLead } from '../../leads/funnelContext';
import { trackEvent } from '../../leads/funnelEvents';
import PrivacyPolicyModal from '../contact/PrivacyPolicyModal';
import QualifierRail from './QualifierRail';
import TileStep from './TileStep';
import ContactStep from './ContactStep';
import ThanksStep from './ThanksStep';
import './QualifierModal.css';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';

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

export default function QualifierModal({ onClose }) {
    const { t, i18n } = useTranslation();
    const { pathname } = useLocation();
    const [answers, setAnswers] = useState(() => {
        const saved = loadLeadSession().qualifier;
        if (saved?.history) return relevantAnswers(saved.history, saved.answers ?? {});
        const service = chatService();
        return saved?.answers ?? (service ? { service } : {});
    });
    const [submitted, setSubmitted] = useState(null);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [sending, setSending] = useState(false);
    const dialogRef = useRef(null);
    const titleRef = useRef(null);
    const { service } = answers;
    const variant = service === 'emergency' ? 'emergency' : 'contact';
    const close = useCallback(() => {
        if (sending) return;
        if (service && !submitted) trackEvent('qualifier_closed_midway', { step: variant });
        onClose({ savedMidway: Boolean(service && !submitted) });
    }, [onClose, service, submitted, sending, variant]);
    useDialog(dialogRef, close, !showPrivacy);

    useEffect(() => {
        updateLeadSession({ qualifier: submitted ? null : { answers }, qualifierAnswers: answers });
    }, [answers, submitted]);

    useEffect(() => {
        titleRef.current?.focus();
        if (!service && !submitted) trackEvent('qualifier_step', { step: 'service', index: 1 });
    }, [service, submitted]);

    const send = async (contact) => {
        setSending(true);
        try {
            const existing = sentLead();
            if (existing) {
                const topic = t(`qualifier.steps.service.options.${service}.label`);
                await submitLeadNote([topic, contact.answers.message ?? contact.answers.description].filter(Boolean).join(': '));
                setSubmitted({ name: existing.name, variant: 'noted' });
                return;
            }
            await submitLead({
                ...contact,
                source: 'qualifier',
                page: pathname,
                lang: i18n.language === 'en' ? 'en' : 'pl',
                answers: { ...answers, ...contact.answers },
            });
            markLeadSent(contact.name);
            trackEvent('lead_submitted', { source: 'qualifier', variant });
            setSubmitted({ name: contact.name, variant });
        } finally {
            setSending(false);
        }
    };

    const title = submitted
        ? t('qualifier.thanks.title', { name: submitted.name, context: submitted.name ? undefined : 'anonymous' })
        : service ? t(`qualifier.steps.service.options.${service}.label`) : t('qualifier.steps.service.prompt');

    return createPortal(
        <div className="lq-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
            <div ref={dialogRef} className={service ? 'lq-dialog lq-dialog--contact' : 'lq-dialog'}
                role="dialog" aria-modal="true" aria-labelledby="lq-chat-title" tabIndex={-1}>
                <QualifierRail notes={[]} />
                <div className="lq-main">
                    <div className="lq-dialog__top">
                        <h2 ref={titleRef} tabIndex={-1} id="lq-chat-title" className="lq-dialog__title">{title}</h2>
                        <button type="button" className="lq-icon-btn" onClick={close} disabled={sending} aria-label={t('qualifier.close')}>
                            <FaTimes aria-hidden="true" />
                        </button>
                    </div>
                    <div className="lq-chat">
                        {submitted ? (
                            <>
                                <p>{t(`qualifier.thanks.text.${submitted.variant}`)}</p>
                                <ThanksStep variant={submitted.variant} answers={answers} onClose={close} />
                            </>
                        ) : service ? (
                            <div className="lq-exchange--contact">
                                <ContactStep variant={variant} topic={service} noteOnly={Boolean(sentLead())}
                                    initialNote={loadLeadSession().chat?.note}
                                    onSubmit={send} onShowPrivacy={() => setShowPrivacy(true)} />
                            </div>
                        ) : (
                            <TileStep stepId="service" answers={answers} onAnswer={(service) => setAnswers({ service })} />
                        )}
                    </div>
                    {service && !submitted && (
                        <div className="lq-dialog__footer">
                            <button type="button" className="lq-back" disabled={sending} onClick={() => setAnswers({})}>
                                <FaArrowLeft aria-hidden="true" /> {t('qualifier.back')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}
        </div>,
        document.body
    );
}
