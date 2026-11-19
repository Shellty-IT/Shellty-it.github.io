import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { buildDiagnosis, resolveFollowUp } from '../../leads/qualifierEngine';
import { submitLeadNote } from '../../leads/leadApi';
import { ProjectLink, useProject } from './ProjectCard';

const MAX_NOTE = 1000;

export default function ThanksStep({ variant, answers, onClose }) {
    const { t } = useTranslation();
    const diagnosis = buildDiagnosis(answers);
    const project = useProject(variant === 'emergency' ? null : diagnosis.projectId);
    const [note, setNote] = useState('');
    const [noteStatus, setNoteStatus] = useState('idle');
    const followUp = resolveFollowUp(diagnosis.path, variant);

    const sendNote = async (event) => {
        event.preventDefault();
        if (!note.trim() || noteStatus === 'sending') return;
        setNoteStatus('sending');
        try {
            await submitLeadNote(note.trim());
            setNoteStatus('sent');
        } catch {
            setNoteStatus('error');
        }
    };

    return (
        <div className="lq-thanks">
            {followUp && (
                noteStatus === 'sent' ? (
                    <p className="lq-card lq-thanks__sent" role="status">{t('qualifier.thanks.noteSent')}</p>
                ) : (
                    <form className="lq-card" onSubmit={sendNote}>
                        <label className="lq-field__label" htmlFor="lq-note">
                            {t(`qualifier.thanks.followUp.${followUp}`)}
                        </label>
                        <textarea
                            id="lq-note"
                            className="lq-input lq-input--area"
                            rows={3}
                            maxLength={MAX_NOTE}
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                        />
                        <button
                            type="submit"
                            className="lq-secondary"
                            disabled={!note.trim() || noteStatus === 'sending'}
                        >
                            {noteStatus === 'sending' ? t('qualifier.contact.sending') : t('qualifier.thanks.sendNote')}
                        </button>
                        <p className="lq-form-status" role="alert">
                            {noteStatus === 'error' ? t('qualifier.contact.errors.network') : ''}
                        </p>
                    </form>
                )
            )}

            <div className="lq-thanks__actions">
                {project ? (
                    <ProjectLink project={project} />
                ) : (
                    <Link className="lq-link" to="/portfolio" onClick={onClose}>
                        {t('qualifier.thanks.portfolio')}
                    </Link>
                )}
                <button type="button" className="lq-secondary" onClick={onClose}>
                    {t('qualifier.thanks.close')}
                </button>
            </div>
        </div>
    );
}
