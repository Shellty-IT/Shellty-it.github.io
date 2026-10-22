import React, { useMemo, useState, useEffect, useCallback, memo } from 'react';
import './styles/Portfolio.css';
import './styles/PortfolioIcon.css';
import './styles/ProjectCard.css';
import './styles/ProjectImage.css';
import './styles/Skeleton.css';
import './styles/TestAccount.css';
import { FaGithub, FaExternalLinkAlt, FaKey, FaCopy, FaCheck, FaPlay } from 'react-icons/fa';
import { useTranslation, Trans } from 'react-i18next';
import VideoModal from '../video/VideoModal';
import { getProjects } from './projects';

import portfolioIcon from '../../assets/icons/portfolio/portfolio.webp';
import portfolioGlow from '../../assets/icons/portfolio/portfolio_glow.webp';

import SectionIcon from '../sectionIcon/SectionIcon';
import SectionTitle from '../sectionTitle/SectionTitle';

const ICON_NODES = [
    { id: 0, x: "15%", y: "15%" },
    { id: 1, x: "50%", y: "8%" },
    { id: 2, x: "85%", y: "15%" },
    { id: 3, x: "25%", y: "45%" },
    { id: 4, x: "75%", y: "45%" },
    { id: 5, x: "15%", y: "80%" },
    { id: 6, x: "50%", y: "88%" },
    { id: 7, x: "85%", y: "80%" },
    { id: 8, x: "50%", y: "50%" },
];

const ProjectImage = memo(({ src, alt }) => {
    const [phase, setPhase] = useState('loading');
    const decodeTimerRef = React.useRef(null);

    useEffect(() => {
        return () => {
            if (decodeTimerRef.current) {
                clearTimeout(decodeTimerRef.current);
                decodeTimerRef.current = null;
            }
        };
    }, []);

    const handleLoad = useCallback(() => {
        setPhase('decoding');
        if (decodeTimerRef.current) clearTimeout(decodeTimerRef.current);
        decodeTimerRef.current = setTimeout(() => {
            setPhase('done');
            decodeTimerRef.current = null;
        }, 700);
    }, []);

    return (
        <div className="project-img-reveal" data-phase={phase}>
            <div className="project-img-placeholder" aria-hidden="true">
                <div className="project-img-placeholder__scanline" />
                <div className="project-img-placeholder__grid" aria-hidden="true" />
                <span className="project-img-placeholder__label">LOADING...</span>
            </div>

            <img
                src={src}
                alt={alt}
                className="project-image"
                loading="lazy"
                decoding="async"
                width="1280"
                height="720"
                onLoad={handleLoad}
            />

            <div className="project-img-glitch" aria-hidden="true" />
        </div>
    );
});

const CopyButton = memo(({ text, label }) => {
    const [copied, setCopied] = useState(false);
    const copiedTimerRef = React.useRef(null);

    useEffect(() => {
        return () => {
            if (copiedTimerRef.current) {
                clearTimeout(copiedTimerRef.current);
                copiedTimerRef.current = null;
            }
        };
    }, []);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        setCopied(true);
        if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = setTimeout(() => {
            setCopied(false);
            copiedTimerRef.current = null;
        }, 2000);
    }, [text]);

    return (
        <button
            className={`copy-btn${copied ? ' copied' : ''}`}
            onClick={handleCopy}
            aria-label={label}
            title={label}
            type="button"
        >
            {copied ? <FaCheck /> : <FaCopy />}
        </button>
    );
});

const TestAccountBox = memo(({ account, t }) => {
    if (!account?.fields?.length) return null;

    return (
        <div className="test-account" role="region" aria-label={t('portfolio.testAccount.title')}>
            <div className="test-account-header">
                <FaKey className="test-account-icon" />
                <span>{t('portfolio.testAccount.title')}</span>
            </div>
            <p className="test-account-note">
                {account.noteKey ? t(account.noteKey) : t('portfolio.testAccount.note')}
            </p>
            <div className="test-account-credentials">
                {account.fields.map(({ labelKey, value }) => (
                    <div className="credential-row" key={labelKey}>
                        <div className="credential-label-container">
                            <span className="credential-label">
                                {t(`portfolio.testAccount.fields.${labelKey}`)}
                            </span>
                        </div>
                        <div className="credential-value-wrapper">
                            <code className="credential-value">{value}</code>
                            <CopyButton
                                text={value}
                                label={t(`portfolio.testAccount.copy.${labelKey}`)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

/**
 * Renderuje linie opisu projektu z zachowaniem podziałów \n.
 * Memoizowany i wyciągnięty do osobnego komponentu - split() wykonywany
 * raz przy zmianie description, nie przy każdym rerenderze karty.
 */
const ProjectDescription = memo(({ description }) => {
    const lines = useMemo(() => description.split('\n'), [description]);
    return (
        <p className="project-description" itemProp="description">
            {lines.map((line, i) => (
                <React.Fragment key={i}>
                    {line}
                    {i < lines.length - 1 && <br />}
                </React.Fragment>
            ))}
        </p>
    );
});

const Portfolio = () => {
    const { t, i18n } = useTranslation();
    const currentLanguage = i18n.language;
    const [titleHovered, setTitleHovered] = useState(false);
    const [videoModal, setVideoModal] = useState({ open: false, url: '', title: '' });
    const [activeFilter, setActiveFilter] = useState('all');

    const openVideo = useCallback((url, title) => {
        setVideoModal({ open: true, url, title });
    }, []);

    const closeVideo = useCallback(() => {
        setVideoModal({ open: false, url: '', title: '' });
    }, []);

    const projects = useMemo(() => getProjects(t, currentLanguage), [t, currentLanguage]);

    const filters = [
        { key: 'all', label: t('portfolio.filters.all') },
        { key: 'web', label: t('portfolio.filters.web') },
        { key: 'ai', label: t('portfolio.filters.ai') },
        { key: 'mobile', label: t('portfolio.filters.mobile') },
        { key: 'wordpress', label: t('portfolio.filters.wordpress') },
        { key: 'tools', label: t('portfolio.filters.tools') },
    ];

    const filteredProjects = useMemo(() => (
        activeFilter === 'all'
            ? projects
            : projects.filter((p) => p.categories?.includes(activeFilter))
    ), [projects, activeFilter]);

    return (
        <div className="portfolio-container" id="portfolio">
            <div className="gradient-background" aria-hidden="true"></div>
            <div className="content-wrapper">
                <header className="portfolio-header animate-fade-in">
                    <SectionIcon
                        className="pf-icon"
                        nodes={ICON_NODES}
                        icon={portfolioIcon}
                        glow={portfolioGlow}
                        size="200"
                    />

                    <div
                        className="portfolio-header-hover-area"
                        onMouseEnter={() => setTitleHovered(true)}
                        onMouseLeave={() => setTitleHovered(false)}
                    >
                        <SectionTitle
                            num="06"
                            title={t('portfolio.title')}
                            sub={t('portfolio.sub')}
                            hovered={titleHovered}
                        />
                    </div>
                    <p className="portfolio-subtitle">
                        <Trans
                            i18nKey="portfolio.subtitleHtml"
                            components={{
                                link: <a href="https://github.com/shellty-it" target="_blank" rel="noopener noreferrer" aria-label="GitHub" />,
                                pulseLink: <a href="https://shellty-pulse.duckdns.org" target="_blank" rel="noopener noreferrer" className="warning-glow" aria-label="Shellty Pulse" />,
                                warning: <span className="warning-glow" />
                            }}
                        />
                    </p>

                    <div
                        className="portfolio-filters"
                        role="group"
                        aria-label={t('portfolio.filters.aria')}
                    >
                        {filters.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                className={`portfolio-filter${activeFilter === f.key ? ' is-active' : ''}`}
                                onClick={() => setActiveFilter(f.key)}
                                aria-pressed={activeFilter === f.key}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </header>

                <section className="projects-grid" aria-live="polite">
                    {filteredProjects.map((project, index) => (
                        <article
                            key={project.id}
                            className={`project-card animate-slide-up delay-${(index % 4) + 1}${project.featured ? ' project-card--featured' : ''}`}
                            itemScope
                            itemType="https://schema.org/CreativeWork"
                        >
                            <span className="corner tl" />
                            <span className="corner br" />

                            {project.image && (
                                <div className="project-image-wrapper">
                                    <ProjectImage
                                        src={project.image}
                                        alt={project.title}
                                    />
                                    {project.featured && (
                                        <span className="pf-cover-badge pf-cover-badge--featured">
                                            {t('portfolio.featuredBadge')}
                                        </span>
                                    )}
                                    {project.videoLink && (
                                        <span className="pf-cover-badge pf-cover-badge--video" aria-hidden="true">
                                            <FaPlay /> {t('portfolio.videoBadge')}
                                        </span>
                                    )}
                                    <div className="image-overlay">
                                        {project.demoLink && (
                                            <a
                                                href={project.demoLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="overlay-cta"
                                                aria-label={`${t('portfolio.actions.demo')} - ${project.title}`}
                                            >
                                                <FaExternalLinkAlt /> {t('portfolio.actions.demo')}
                                            </a>
                                        )}
                                        {project.videoLink && (
                                            <button
                                                type="button"
                                                className="overlay-cta overlay-cta--video"
                                                onClick={() => openVideo(project.videoLink, project.title)}
                                                aria-label={`${t('portfolio.actions.videoPresentation')} - ${project.title}`}
                                            >
                                                <FaPlay /> {t('portfolio.actions.videoPresentation')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="project-content">
                                <header className="project-header">
                                    <h2 className="project-heading" itemProp="name">
                                        {project.title}
                                        {project.status && (
                                            <span className="project-status">
                                                {t('portfolio.projects.shelltyLingo.statusPrefix')}
                                                <a
                                                    href="https://expo.dev/accounts/shellty-it/projects/shellty-lingo/builds/aaf7bead-6a11-497a-a65a-bc8e7315cbee"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {t('portfolio.projects.shelltyLingo.betaLink')}
                                                </a>
                                                {t('portfolio.projects.shelltyLingo.statusSuffix')}
                                            </span>
                                        )}
                                    </h2>
                                    <div className="project-meta">
                                        {project.subtitle && <span className="project-subtitle" itemProp="about">{project.subtitle}</span>}
                                        {project.year && (
                                            <span className="project-chipset">
                                                <span className="chip">{project.year}</span>
                                            </span>
                                        )}
                                    </div>
                                </header>

                                <ProjectDescription description={project.description} />

                                {project.highlights && Array.isArray(project.highlights) && project.highlights.length > 0 && (
                                    <div className="project-highlights">
                                        {project.highlightsTitle && <p className="highlights-title">{project.highlightsTitle}</p>}
                                        <ul className="highlights-list">
                                            {project.highlights.map((highlight, i) => (
                                                <li key={i}>{highlight}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="project-tech-stack" aria-label={t('portfolio.tech.aria', { defaultValue: 'Technologie' })}>
                                    {project.technologies?.map((tech) => (
                                        <span key={tech} className="tech-badge">{tech}</span>
                                    ))}
                                </div>

                                <div className="project-bottom">
                                    <TestAccountBox account={project.testAccount} t={t} />
                                    <div className="project-links">
                                        {project.demoLink && (
                                            <a href={project.demoLink} target="_blank" rel="noopener noreferrer" className="project-link project-link--primary">
                                                <FaExternalLinkAlt /> {t('portfolio.actions.demo')}
                                            </a>
                                        )}
                                        {project.githubLink && (
                                            <a href={project.githubLink} target="_blank" rel="noopener noreferrer" className="project-link">
                                                <FaGithub /> {t('portfolio.actions.code')}
                                            </a>
                                        )}
                                        {project.videoLink && (
                                            <button
                                                type="button"
                                                className="project-link project-link--video"
                                                onClick={() => openVideo(project.videoLink, project.title)}
                                            >
                                                <FaPlay /> {t('portfolio.actions.videoPresentation')}
                                            </button>
                                        )}
                                        {project.caseStudyLink && (
                                            <a href={project.caseStudyLink} target="_blank" rel="noopener noreferrer" className="project-link subtle">
                                                {t('portfolio.actions.case', { defaultValue: 'Case study' })}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </section>
            </div>

            <VideoModal
                isOpen={videoModal.open}
                onClose={closeVideo}
                videoUrl={videoModal.url}
                title={videoModal.title}
                t={t}
            />
        </div>
    );
};

export default Portfolio;
