import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck } from 'react-icons/fa';
import { QUESTION_STEPS } from '../../leads/qualifierConfig';
import { stepOptions } from '../../leads/qualifierEngine';

const MAX_SITE_URL = 200;

function Tile({ stepId, option, selected, disabled, onClick, className = '' }) {
    const { t } = useTranslation();
    const Icon = option.icon;
    return (
        <button
            type="button"
            className={`lq-tile${selected ? ' is-selected' : ''} ${className}`}
            aria-pressed={selected}
            disabled={disabled}
            onClick={onClick}
        >
            {Icon && <Icon className="lq-tile__icon" aria-hidden="true" />}
            <span className="lq-tile__label">
                {t(`qualifier.steps.${stepId}.options.${option.id}.label`)}
            </span>
            {selected && <FaCheck className="lq-tile__check" aria-hidden="true" />}
        </button>
    );
}

export default function TileStep({ stepId, answers, onAnswer, disabled }) {
    const { t } = useTranslation();
    const step = QUESTION_STEPS[stepId];
    const options = stepOptions(stepId);
    const [selected, setSelected] = useState(() => [].concat(answers[stepId] ?? []));
    const [siteUrl, setSiteUrl] = useState(answers.siteUrl ?? '');

    const toggle = (id) => {
        setSelected((current) =>
            current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
        );
    };

    const submitMultiple = (event) => {
        event.preventDefault();
        onAnswer(selected, step.withSiteUrl ? { siteUrl: siteUrl.trim() } : {});
    };

    return (
        <form className="lq-replies" onSubmit={submitMultiple}>
            {step.multiple && (
                <p className="lq-step__hint">{t('qualifier.maxHint', { count: step.multiple })}</p>
            )}

            <div className="lq-tiles">
                {options.map((option) => {
                    const isSelected = selected.includes(option.id);
                    return (
                        <Tile
                            key={option.id}
                            stepId={stepId}
                            option={option}
                            selected={isSelected}
                            disabled={disabled || (step.multiple && !isSelected && selected.length >= step.multiple)}
                            onClick={() => (step.multiple ? toggle(option.id) : onAnswer(option.id))}
                        />
                    );
                })}
            </div>

            {step.urgentOption && (
                <Tile
                    stepId={stepId}
                    option={step.urgentOption}
                    selected={answers[stepId] === step.urgentOption.id}
                    disabled={disabled}
                    className="lq-tile--urgent"
                    onClick={() => onAnswer(step.urgentOption.id)}
                />
            )}

            {step.withSiteUrl && (
                <div className="lq-field">
                    <label className="lq-field__label" htmlFor="lq-site-url">
                        {t('qualifier.siteUrl.label')}
                    </label>
                    <input
                        id="lq-site-url"
                        className="lq-input"
                        type="text"
                        inputMode="url"
                        autoComplete="url"
                        maxLength={MAX_SITE_URL}
                        placeholder={t('qualifier.siteUrl.placeholder')}
                        value={siteUrl}
                        disabled={disabled}
                        onChange={(event) => setSiteUrl(event.target.value)}
                    />
                </div>
            )}

            {step.multiple && (
                <button type="submit" className="lq-primary" disabled={disabled || selected.length === 0}>
                    {t('qualifier.next')}
                </button>
            )}
        </form>
    );
}
