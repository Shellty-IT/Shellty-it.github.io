import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheckCircle, FaCommentDots, FaThumbsUp } from 'react-icons/fa';
import { buildDiagnosis } from '../../leads/qualifierEngine';
import ProjectCard from './ProjectCard';
import Review from './Review';

export default function DiagnosisStep({ answers, onAccept, onAskQuestion }) {
    const { t } = useTranslation();
    const diagnosis = buildDiagnosis(answers);

    return (
        <div className="lq-diagnosis">
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
            </section>

            <ProjectCard
                projectId={diagnosis.projectId}
                reason={diagnosis.projectReason}
                title={t('qualifier.diagnosis.projectTitle')}
            />

            {diagnosis.isShort && (
                <>
                    <p className="lq-bubble">{t('qualifier.diagnosis.softText')}</p>
                    <div className="lq-tiles">
                        <button type="button" className="lq-tile lq-tile--accent" onClick={onAccept}>
                            <FaThumbsUp className="lq-tile__icon" aria-hidden="true" />
                            <span className="lq-tile__label">{t('qualifier.diagnosis.softCta')}</span>
                        </button>
                    </div>
                </>
            )}

            {!diagnosis.isShort && (
                <>
                    <Review index={diagnosis.reviewIndex} />

                    <section className="lq-card">
                        <h3 className="lq-card__title">{t('qualifier.diagnosis.whyTitle')}</h3>
                        <ul className="lq-list">
                            {t('qualifier.diagnosis.why', { returnObjects: true }).map((item) => (
                                <li key={item}>
                                    <FaCheckCircle className="lq-list__icon" aria-hidden="true" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="lq-card">
                        <h3 className="lq-card__title">{t('qualifier.diagnosis.processTitle')}</h3>
                        <ol className="lq-process">
                            {t('qualifier.diagnosis.process', { returnObjects: true }).map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ol>
                    </section>

                    <p className="lq-bubble">{t('qualifier.diagnosis.consentQuestion')}</p>
                    <div className="lq-tiles">
                        <button type="button" className="lq-tile lq-tile--accent" onClick={onAccept}>
                            <FaThumbsUp className="lq-tile__icon" aria-hidden="true" />
                            <span className="lq-tile__label">{t('qualifier.diagnosis.yes')}</span>
                        </button>
                        <button type="button" className="lq-tile" onClick={onAskQuestion}>
                            <FaCommentDots className="lq-tile__icon" aria-hidden="true" />
                            <span className="lq-tile__label">{t('qualifier.diagnosis.question')}</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
