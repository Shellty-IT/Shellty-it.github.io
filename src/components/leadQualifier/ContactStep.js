import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEnvelope, FaPhoneAlt } from 'react-icons/fa';
import { LeadApiError } from '../../leads/leadApi';
import { trackEvent } from '../../leads/funnelEvents';
import Review from './Review';

const MAX_NAME = 60;
const MAX_EMAIL = 254;
const MAX_NOTE = 500;
const CALL_TIMES = ['morning', 'afternoon', 'evening'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function formatPhone(input) {
    const digits = input.replace(/\D/g, '').replace(/^(?:48|0048)(?=\d{9})/, '').slice(0, 9);
    return digits.replace(/(\d{3})(?=\d)/g, '$1 ');
}

function phoneDigits(formatted) {
    return formatted.replace(/\D/g, '');
}

const CHANNEL_CHOICE = ['contact', 'chat'];
const NOTE_FIELD = { emergency: 'description', chat: 'message' };

function initialChannel(variant) {
    return variant === 'soft' ? 'email' : 'phone';
}

function validate(values, channel, t) {
    const errors = {};
    if (channel === 'phone' && !/^[1-9]\d{8}$/.test(phoneDigits(values.phone))) {
        errors.phone = t('qualifier.contact.errors.phone');
    }
    if (channel === 'email' && !EMAIL_PATTERN.test(values.email.trim())) {
        errors.email = t('qualifier.contact.errors.email');
    }
    if (!values.consent) errors.consent = t('qualifier.contact.errors.consent');
    return errors;
}

function submitErrorMessage(error, t) {
    if (error instanceof LeadApiError && error.status === 429) return t('qualifier.contact.errors.rateLimited');
    if (error instanceof LeadApiError && error.status === 400) return t('qualifier.contact.errors.invalid');
    return t('qualifier.contact.errors.network');
}

function Field({ id, label, error, children }) {
    return (
        <div className="lq-field">
            <label className="lq-field__label" htmlFor={id}>{label}</label>
            {children}
            {error && <p id={`${id}-error`} className="lq-field__error">{error}</p>}
        </div>
    );
}

export default function ContactStep({ variant, review, initialNote = '', onSubmit, onShowPrivacy }) {
    const { t } = useTranslation();
    const [channel, setChannel] = useState(() => initialChannel(variant));
    const [values, setValues] = useState({
        name: '',
        phone: '',
        email: '',
        callTime: '',
        note: initialNote,
        consent: false,
        fax: '',
    });
    const [showErrors, setShowErrors] = useState(false);

    useEffect(() => {
        trackEvent('contact_card_shown', { variant });
    }, [variant]);
    const [status, setStatus] = useState({ sending: false, error: '' });

    const errors = validate(values, channel, t);
    const visibleErrors = showErrors ? errors : {};
    const copy = (key) => t(`qualifier.contact.${variant}.${key}`);
    const noteField = NOTE_FIELD[variant];

    const setValue = (name, value) => setValues((current) => ({ ...current, [name]: value }));
    const inputProps = (name) => ({
        id: `lq-${name}`,
        name,
        'aria-invalid': Boolean(visibleErrors[name]),
        'aria-describedby': visibleErrors[name] ? `lq-${name}-error` : undefined,
    });

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (status.sending) return;
        const [firstInvalid] = Object.keys(errors);
        if (firstInvalid) {
            setShowErrors(true);
            document.getElementById(`lq-${firstInvalid}`)?.focus();
            return;
        }
        setStatus({ sending: true, error: '' });
        const answers = {};
        if (channel === 'phone' && values.callTime) answers.callTime = values.callTime;
        if (noteField && values.note.trim()) answers[noteField] = values.note.trim();
        try {
            await onSubmit({
                name: values.name.trim(),
                phone: channel === 'phone' ? phoneDigits(values.phone) : '',
                email: channel === 'email' ? values.email.trim() : '',
                consent: values.consent,
                consentText: `${t('qualifier.contact.consent')} ${t('qualifier.contact.privacyLink')}.`,
                fax: values.fax,
                answers,
            });
        } catch (error) {
            setStatus({ sending: false, error: submitErrorMessage(error, t) });
        }
    };

    return (
        <form className="lq-card lq-contact" onSubmit={handleSubmit} noValidate>

            {CHANNEL_CHOICE.includes(variant) && (
                <div className="lq-tiles" role="group" aria-label={t('qualifier.contact.channelAria')}>
                    {[
                        { id: 'phone', icon: FaPhoneAlt },
                        { id: 'email', icon: FaEnvelope },
                    ].map(({ id, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            className={`lq-tile${channel === id ? ' is-selected' : ''}`}
                            aria-pressed={channel === id}
                            onClick={() => setChannel(id)}
                        >
                            <Icon className="lq-tile__icon" aria-hidden="true" />
                            <span className="lq-tile__label">{t(`qualifier.contact.channels.${id}`)}</span>
                        </button>
                    ))}
                </div>
            )}

            <Field id="lq-name" label={t('qualifier.contact.fields.name')} error={visibleErrors.name}>
                <input
                    {...inputProps('name')}
                    className="lq-input"
                    type="text"
                    autoComplete="given-name"
                    maxLength={MAX_NAME}
                    value={values.name}
                    onChange={(event) => setValue('name', event.target.value)}
                />
            </Field>

            {channel === 'phone' ? (
                <Field id="lq-phone" label={t('qualifier.contact.fields.phone')} error={visibleErrors.phone}>
                    <div className="lq-phone">
                        <span className="lq-phone__prefix" aria-hidden="true">+48</span>
                        <input
                            {...inputProps('phone')}
                            className="lq-input"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel-national"
                            placeholder="123 456 789"
                            value={values.phone}
                            onChange={(event) => setValue('phone', formatPhone(event.target.value))}
                        />
                    </div>
                </Field>
            ) : (
                <Field id="lq-email" label={t('qualifier.contact.fields.email')} error={visibleErrors.email}>
                    <input
                        {...inputProps('email')}
                        className="lq-input"
                        type="email"
                        autoComplete="email"
                        maxLength={MAX_EMAIL}
                        placeholder={t('qualifier.contact.fields.emailPlaceholder')}
                        value={values.email}
                        onChange={(event) => setValue('email', event.target.value)}
                    />
                </Field>
            )}

            {CHANNEL_CHOICE.includes(variant) && channel === 'phone' && (
                <fieldset className="lq-field lq-chips">
                    <legend className="lq-field__label">{t('qualifier.contact.fields.callTime')}</legend>
                    {CALL_TIMES.map((time) => (
                        <button
                            key={time}
                            type="button"
                            className={`lq-chip${values.callTime === time ? ' is-selected' : ''}`}
                            aria-pressed={values.callTime === time}
                            onClick={() => setValue('callTime', values.callTime === time ? '' : time)}
                        >
                            {t(`qualifier.contact.callTimes.${time}`)}
                        </button>
                    ))}
                </fieldset>
            )}

            {noteField && (
                <Field id="lq-note-field" label={t(`qualifier.contact.fields.${noteField}`)}>
                    <textarea
                        id="lq-note-field"
                        className="lq-input lq-input--area"
                        rows={3}
                        maxLength={MAX_NOTE}
                        value={values.note}
                        onChange={(event) => setValue('note', event.target.value)}
                    />
                </Field>
            )}

            <div className="lq-honeypot" aria-hidden="true">
                <label htmlFor="lq-fax">Fax</label>
                <input
                    id="lq-fax"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={values.fax}
                    onChange={(event) => setValue('fax', event.target.value)}
                />
            </div>

            <div className="lq-field">
                <label className="lq-consent">
                    <input
                        {...inputProps('consent')}
                        type="checkbox"
                        checked={values.consent}
                        onChange={(event) => setValue('consent', event.target.checked)}
                    />
                    <span>
                        {t('qualifier.contact.consent')}{' '}
                        <button type="button" className="lq-inline-link" onClick={onShowPrivacy}>
                            {t('qualifier.contact.privacyLink')}
                        </button>
                        .
                    </span>
                </label>
                {visibleErrors.consent && (
                    <p id="lq-consent-error" className="lq-field__error">{visibleErrors.consent}</p>
                )}
            </div>

            <button type="submit" className="lq-primary" disabled={status.sending} aria-busy={status.sending}>
                {status.sending ? t('qualifier.contact.sending') : copy('submit')}
            </button>
            <p className="lq-form-status" role="alert">{status.error}</p>

            {CHANNEL_CHOICE.includes(variant) && (
                <div className="lq-reassure">
                    <p>{t('qualifier.contact.noObligation')}</p>
                    <p>{t('qualifier.contact.responseTime')}</p>
                    {variant === 'contact' && <Review index={review} compact />}
                </div>
            )}
        </form>
    );
}
