import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheckCircle } from 'react-icons/fa';

export default function DiagnosisStep({ diagnosis }) {
    const { t } = useTranslation();

    return (
        <section className="lq-card">
            <h3 className="lq-card__title">{t('qualifier.diagnosis.benefitsTitle')}</h3>
            <ul className="lq-list">
                {diagnosis.benefits.map((key) => (
                    <li key={key}>
                        <FaCheckCircle className="lq-list__icon" aria-hidden="true" />
                        {t(`qualifier.benefits.${key}`)}
                    </li>
                ))}
            </ul>
            <p className="lq-card__note">
                {t(diagnosis.isShort ? 'qualifier.diagnosis.softText' : 'qualifier.diagnosis.note')}
            </p>
        </section>
    );
}
