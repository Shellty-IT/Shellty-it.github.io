import React from 'react';
import { useTranslation } from 'react-i18next';
import { QUESTION_STEPS } from '../../leads/qualifierConfig';

export default function TileStep({ stepId, onAnswer }) {
    const { t } = useTranslation();
    const label = (id) => t(`qualifier.steps.${stepId}.options.${id}.label`);

    return (
        <div className="lq-options" role="group" aria-label={t(`qualifier.steps.${stepId}.prompt`)}>
            {QUESTION_STEPS[stepId].options.map(({ id, icon: Icon, urgent }) => (
                <button
                    key={id}
                    type="button"
                    className={`lq-option${urgent ? ' lq-option--urgent' : ''}`}
                    onClick={() => onAnswer(id)}
                >
                    <Icon className="lq-option__icon" aria-hidden="true" />
                    <span>{label(id)}</span>
                </button>
            ))}
        </div>
    );
}
