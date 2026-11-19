import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck } from 'react-icons/fa';
import avatar from '../../assets/avatar/tomek.webp';
import avatarWide from '../../assets/avatar/tomek_wide.webp';

function Plan({ answered, total }) {
    const { t } = useTranslation();
    const ready = answered === total;
    return (
        <div className={`lq-plan${ready ? ' is-ready' : ''}`}>
            <p className="lq-plan__top">
                <span>{t(ready ? 'qualifier.plan.ready' : 'qualifier.plan.title')}</span>
                <span className="lq-plan__count">{answered}/{total}</span>
            </p>
            <span className="lq-plan__bar" aria-hidden="true">
                {Array.from({ length: total }, (_, index) => (
                    <span key={index} className={index < answered ? 'is-on' : undefined} />
                ))}
            </span>
            <p className="lq-plan__hint">
                {ready ? t('qualifier.plan.readyHint') : t('qualifier.plan.left', { count: total - answered })}
            </p>
        </div>
    );
}

export default function QualifierRail({ notes, plan }) {
    const { t } = useTranslation();
    return (
        <aside className="lq-rail">
            <picture className="lq-rail__photo">
                <source media="(max-width: 640px)" srcSet={avatar} />
                <img src={avatarWide} alt="" width="768" height="512" />
            </picture>
            <div className="lq-rail__who">
                <p className="lq-rail__name">{t('qualifier.rail.name')}</p>
                <p className="lq-rail__status">{t('qualifier.rail.status')}</p>
            </div>
            <figure className="lq-rail__quote">
                <blockquote>{t('qualifier.rail.quote')}</blockquote>
                <figcaption>{t('qualifier.rail.quoteSource')}</figcaption>
            </figure>
            {notes.length > 0 && (
                <ol className="lq-notes" aria-label={t('qualifier.rail.notesAria')}>
                    {notes.map(({ id, label, state }) => (
                        <li
                            key={id}
                            className={`lq-note${state ? ` is-${state}` : ''}`}
                            aria-current={state === 'current' ? 'step' : undefined}
                        >
                            <span className="lq-note__dot" aria-hidden="true">
                                {state === 'done' && <FaCheck />}
                            </span>
                            <span className="lq-note__label">{label}</span>
                        </li>
                    ))}
                </ol>
            )}
            {plan && <Plan answered={plan.answered} total={plan.total} />}
        </aside>
    );
}
