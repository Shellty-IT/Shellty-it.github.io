import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LeadApiError } from '../../leads/leadApi';
import { trackEvent } from '../../leads/funnelEvents';

const FINE_POINTER_QUERY = '(pointer: fine)';
const MAX_EMAIL = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[1-9]\d{8}$/;

export function formatPhone(input) {
    const digits = input.replace(/\D/g, '').replace(/^(?:48|0048)(?=\d{9})/, '').slice(0, 9);
    return digits.replace(/(\d{3})(?=\d)/g, '$1 ');
}

export function submitErrorMessage(error, t) {
    if (error instanceof LeadApiError && error.status === 429) return t('qualifier.contact.errors.rateLimited');
    if (error instanceof LeadApiError && error.status === 400) return t('qualifier.contact.errors.invalid');
    return t('qualifier.contact.errors.network');
}

function validate(phone, email) {
    if (!phone && !email) return { field: 'phone', error: 'contact' };
    if (phone && !PHONE_PATTERN.test(phone)) return { field: 'phone', error: 'phone' };
    if (email && !EMAIL_PATTERN.test(email)) return { field: 'email', error: 'email' };
    return null;
}

export default function PhoneStep({ source, onSubmit, onShowPrivacy }) {
    const { t } = useTranslation();
    const [values, setValues] = useState({ phone: '', email: '' });
    const [fax, setFax] = useState('');
    const [problem, setProblem] = useState(null);
    const [status, setStatus] = useState({ sending: false, error: '' });
    const phoneRef = useRef(null);
    const emailRef = useRef(null);

    useEffect(() => {
        trackEvent('contact_card_shown', { source });
    }, [source]);

    useEffect(() => {
        if (window.matchMedia?.(FINE_POINTER_QUERY).matches) phoneRef.current?.focus({ preventScroll: true });
    }, []);

    const handleChange = (field) => (event) => {
        const { value } = event.target;
        setValues((current) => ({ ...current, [field]: field === 'phone' ? formatPhone(value) : value }));
        setProblem(null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (status.sending) return;
        const phone = values.phone.replace(/\D/g, '');
        const email = values.email.trim();
        const invalid = validate(phone, email);
        if (invalid) {
            setProblem(invalid);
            (invalid.field === 'phone' ? phoneRef : emailRef).current?.focus();
            return;
        }
        setStatus({ sending: true, error: '' });
        try {
            await onSubmit({
                phone,
                email,
                display: [phone && `+48 ${values.phone}`, email].filter(Boolean).join(' · '),
                consent: true,
                consentText: `${t('qualifier.phone.notice')} ${t('qualifier.contact.privacyLink')}.`,
                fax,
            });
        } catch (submitError) {
            setStatus({ sending: false, error: submitErrorMessage(submitError, t) });
        }
    };

    const fieldProps = (field) => ({
        id: `lq-${field}`,
        className: 'lq-input',
        value: values[field],
        'aria-invalid': problem?.field === field,
        'aria-describedby': problem ? 'lq-contact-error' : undefined,
        onChange: handleChange(field),
    });

    return (
        <form className="lq-phone-form" onSubmit={handleSubmit} noValidate>
            <div className="lq-phone-form__field">
                <label className="lq-phone-form__label" htmlFor="lq-phone">{t('qualifier.contact.fields.phone')}</label>
                <div className="lq-phone">
                    <span className="lq-phone__prefix" aria-hidden="true">+48</span>
                    <input
                        {...fieldProps('phone')}
                        ref={phoneRef}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        placeholder="123 456 789"
                    />
                </div>
            </div>
            <div className="lq-phone-form__field">
                <label className="lq-phone-form__label" htmlFor="lq-email">{t('qualifier.contact.fields.email')}</label>
                <input
                    {...fieldProps('email')}
                    ref={emailRef}
                    type="email"
                    autoComplete="email"
                    maxLength={MAX_EMAIL}
                    placeholder={t('qualifier.contact.fields.emailPlaceholder')}
                />
            </div>
            <p className="lq-notice">{t('qualifier.phone.hint')}</p>
            {problem && <p id="lq-contact-error" className="lq-field__error" role="alert">{t(`qualifier.contact.errors.${problem.error}`)}</p>}
            <button type="submit" className="lq-primary" disabled={status.sending} aria-busy={status.sending}>
                {status.sending ? t('qualifier.contact.sending') : t('qualifier.phone.submit')}
            </button>
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
            </p>
        </form>
    );
}
