import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaExternalLinkAlt } from 'react-icons/fa';
import { getProjects } from '../portfolio/projects';

export function useProject(projectId) {
    const { t, i18n } = useTranslation();
    if (!projectId) return null;
    return getProjects(t, i18n.language).find((project) => project.id === projectId) ?? null;
}

export function ProjectLink({ project }) {
    const { t } = useTranslation();
    const href = project.demoLink || project.videoLink;
    if (!href) return null;
    return (
        <a className="lq-link" href={href} target="_blank" rel="noopener noreferrer">
            {t('qualifier.diagnosis.projectLink', { project: project.title })}
            <FaExternalLinkAlt aria-hidden="true" />
            <span className="lq-visually-hidden">{t('qualifier.newTab')}</span>
        </a>
    );
}

export default function ProjectCard({ projectId, reason, title }) {
    const { t } = useTranslation();
    const project = useProject(projectId);
    if (!project) return null;

    return (
        <section className="lq-card lq-project">
            <img
                className="lq-project__image"
                src={project.image}
                alt=""
                width="160"
                height="100"
                loading="lazy"
            />
            <div className="lq-project__text">
                {title && <h3 className="lq-card__title">{title}</h3>}
                <p className="lq-project__name">{project.title}</p>
                <p className="lq-project__desc">
                    {reason ? t(`qualifier.projectReasons.${reason}`) : project.subtitle.replace(/^-\s*|\s*-$/g, '')}
                </p>
                <ProjectLink project={project} />
            </div>
        </section>
    );
}
