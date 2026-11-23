import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPhone, submitErrorMessage } from './ContactStep';

const MAX_EMAIL = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function PhoneStep({ allowEmail, onSubmit, onShowPrivacy }) {
    const { t } = useTranslation();
    const [channel, setChannel] = useState('phone');
    const [values, setValues] = useState({ phone: '', email: '' });
    const [fax, setFax] = useState('');
    const [error, setError] = useState('');
    const [status, setStatus] = useState({ sending: false, error: '' });
    const inputRef = useRef(null);
    const isPhone = channel === 'phone';
    const inputId = `lq-${channel}`;

    useEffect(() => {
        inputRef.current?.focus({ preventScroll: true });
    }, [channel]);

    const switchChannel = () => {
        setChannel(isPhone ? 'email' : 'phone');
        setError('');
    };

    const handleChange = (event) => {
        const { value } = event.target;
        setValues((current) => ({ ...current, [channel]: isPhone ? formatPhone(value) : value }));
        setError('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (status.sending) return;
        const phone = values.phone.replace(/\D/g, '');
        const email = values.email.trim();
        const valid = isPhone ? /^[1-9]\d{8}$/.test(phone) : EMAIL_PATTERN.test(email);
        if (!valid) {
            setError(t(`qualifier.contact.errors.${channel}`));
            inputRef.current?.focus();
            return;
        }
        setStatus({ sending: true, error: '' });
        try {
            await onSubmit({
                phone: isPhone ? phone : '',
                email: isPhone ? '' : email,
                display: isPhone ? `+48 ${values.phone}` : email,
                consent: true,
                consentText: `${t('qualifier.phone.notice')} ${t('qualifier.contact.privacyLink')}.`,
                fax,
            });
        } catch (submitError) {
            setStatus({ sending: false, error: submitErrorMessage(submitError, t) });
        }
    };

    const field = isPhone ? (
        <div className="lq-phone">
            <span className="lq-phone__prefix" aria-hidden="true">+48</span>
            <input
                ref={inputRef}
                id={inputId}
                className="lq-input"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="123 456 789"
                value={values.phone}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${inputId}-error` : undefined}
                onChange={handleChange}
            />
        </div>
    ) : (
        <input
            ref={inputRef}
            id={inputId}
            className="lq-input"
            type="email"
            autoComplete="email"
            maxLength={MAX_EMAIL}
            placeholder={t('qualifier.contact.fields.emailPlaceholder')}
            value={values.email}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            onChange={handleChange}
        />
    );

    return (
        <form className="lq-phone-form" onSubmit={handleSubmit} noValidate>
            <label className="lq-visually-hidden" htmlFor={inputId}>
                {t(isPhone ? 'qualifier.contact.fields.phone' : 'qualifier.contact.fields.email')}
            </label>
            <div className="lq-phone-form__row">
                {field}
                <button type="submit" className="lq-primary" disabled={status.sending} aria-busy={status.sending}>
                    {status.sending ? t('qualifier.contact.sending') : t('qualifier.phone.submit')}
                </button>
            </div>
            {error && <p id={`${inputId}-error`} className="lq-field__error">{error}</p>}
            <p className="lq-form-status" role="alert">{status.error}</p>
            <div className="lq-honeypot" aria-hidden="true">
                <label htmlFor="lq-fax">Fax</label>
                <input
                    id="lq-fax"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={fax}
                    onChange={(event) => setFax(event.target.value)}
                />
            </div>
            <p className="lq-notice">
                {t('qualifier.phone.notice')}{' '}
                <button type="button" className="lq-inline-link" onClick={onShowPrivacy}>
                    {t('qualifier.contact.privacyLink')}
                </button>
                .
                {allowEmail && (
                    <>
                        {' '}
                        <button type="button" className="lq-inline-link" onClick={switchChannel}>
                            {t(isPhone ? 'qualifier.phone.useEmail' : 'qualifier.phone.usePhone')}
                        </button>
                    </>
                )}
            </p>
        </form>
    );
}
