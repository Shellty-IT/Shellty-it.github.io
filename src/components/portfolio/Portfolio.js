import React, { useMemo, useState, useCallback, memo } from 'react';
import './styles/Portfolio.css';
import './styles/PortfolioIcon.css';
import './styles/ProjectCard.css';
import './styles/ProjectImage.css';
import './styles/Skeleton.css';
import './styles/TestAccount.css';
import './styles/VideoModal.css';
import { FaGithub, FaExternalLinkAlt, FaKey, FaCopy, FaCheck, FaPlay, FaTimes } from 'react-icons/fa';
import { useTranslation, Trans } from 'react-i18next';

import mobisalonThumbnail from '../../assets/thumbnails/mobisalon.webp';
import ksefThumbnail from '../../assets/thumbnails/ksef-master.webp';
import ksefThumbnailAng from '../../assets/thumbnails/ksef_master_ang.webp';
import smartquoteThumbnail from '../../assets/thumbnails/smartquote.webp';
import smartquoteThumbnailAng from '../../assets/thumbnails/smart_quoute_ang.webp';
import postlioThumbnail from '../../assets/thumbnails/postlio.webp';
import postlioThumbnailAng from '../../assets/thumbnails/postlio_ang.webp';
import cookbookThumbnail from '../../assets/thumbnails/mobile_cook.webp';
import animalsThumbnail from '../../assets/thumbnails/one_page_animals.webp';
import shelltyBlogThumbnail from '../../assets/thumbnails/shellty_blog.webp';
import shelltyPulseThumbnail from '../../assets/thumbnails/shellty_pulse.webp';
import kanbanThumbnail from '../../assets/thumbnails/kanban.webp';
import kanbanThumbnailAng from '../../assets/thumbnails/kanban_ang.webp';

import portfolioIcon from '../../assets/icons/portfolio/portfolio.webp';
import portfolioGlow from '../../assets/icons/portfolio/portfolio_glow.webp';

import { createPortal } from 'react-dom';
import { useIconPhase } from '../../hooks/useIconPhase';

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

// Memoizowane — nie rerenderuje się gdy rodzic zmienia stan (np. titleHovered, videoModal)
const ProjectImage = memo(({ src, alt }) => {
    const [phase, setPhase] = useState('loading');

    const handleLoad = useCallback(() => {
        setPhase('decoding');
        setTimeout(() => {
            setPhase('done');
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
                onLoad={handleLoad}
            />

            <div className="project-img-glitch" aria-hidden="true" />
        </div>
    );
});

// Memoizowany — stan copied jest lokalny, nie wpływa na rodzeństwo
const CopyButton = memo(({ text, label }) => {
    const [copied, setCopied] = useState(false);

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
        setTimeout(() => setCopied(false), 2000);
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

// Memoizowany — rerenderuje się tylko gdy zmienia się account lub język
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

const VideoModal = ({ isOpen, onClose, videoUrl, title }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const embedUrl = videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/') + '?autoplay=1&title=0&byline=0&portrait=0';

    return createPortal(
        <div className="video-modal-overlay" onClick={onClose}>
            <button
                className="video-modal-close"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                aria-label="Close"
                type="button"
            >
                <FaTimes />
            </button>
            <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
                <iframe
                    src={embedUrl}
                    title={title}
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                />
            </div>
        </div>,
        document.body
    );
};

/**
 * Renderuje linie opisu projektu z zachowaniem podziałów \n.
 * Memoizowany i wyciągnięty do osobnego komponentu — split() wykonywany
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

    const { iconRef, iconPhase } = useIconPhase('pf-icon--pulse');

    const openVideo = useCallback((url, title) => {
        setVideoModal({ open: true, url, title });
    }, []);

    const closeVideo = useCallback(() => {
        setVideoModal({ open: false, url: '', title: '' });
    }, []);

    const projects = useMemo(() => ([
        {
            id: "postlio",
            image: currentLanguage === 'en' ? postlioThumbnailAng : postlioThumbnail,
            demoLink: 'https://postlio.netlify.app/',
            githubLink: null,
            title: t('portfolio.projects.postlio.title'),
            subtitle: t('portfolio.projects.postlio.subtitle'),
            description: t('portfolio.projects.postlio.description'),
            highlightsTitle: t('portfolio.projects.postlio.highlightsTitle', { defaultValue: '' }),
            highlights: t('portfolio.projects.postlio.highlights', { returnObjects: true, defaultValue: [] }),
            technologies: t('portfolio.projects.postlio.tech', { returnObjects: true }),
            role: t('portfolio.projects.postlio.role', { defaultValue: 'Developer' }),
            year: '2026',
            caseStudyLink: t('portfolio.projects.postlio.case', { defaultValue: '' }) || null,
            testAccount: {
                fields: [
                    { labelKey: 'login', value: 'test@test.pl' },
                    { labelKey: 'password', value: 'Testowe123!' },
                ],
            },
        },
        {
            id: "smartQuoteAI",
            image: currentLanguage === 'en' ? smartquoteThumbnailAng : smartquoteThumbnail,
            demoLink: 'https://smartquote-ai.netlify.app',
            githubLink: 'https://github.com/Shellty-IT/SmartQuote_backend',
            title: t('portfolio.projects.smartQuoteAI.title'),
            subtitle: t('portfolio.projects.smartQuoteAI.subtitle'),
            description: t('portfolio.projects.smartQuoteAI.description'),
            highlightsTitle: t('portfolio.projects.smartQuoteAI.highlightsTitle', { defaultValue: '' }),
            highlights: t('portfolio.projects.smartQuoteAI.highlights', { returnObjects: true, defaultValue: [] }),
            technologies: t('portfolio.projects.smartQuoteAI.tech', { returnObjects: true }),
            role: t('portfolio.projects.smartQuoteAI.role', { defaultValue: 'Developer' }),
            year: '2026',
            caseStudyLink: t('portfolio.projects.smartQuoteAI.case', { defaultValue: '' }) || null,
            testAccount: {
                fields: [
                    { labelKey: 'login', value: 'testowy@test.pl' },
                    { labelKey: 'password', value: 'Testowe123!' },
                ],
            },
        },
        {
            id: "ksefMaster",
            image: currentLanguage === 'en' ? ksefThumbnailAng : ksefThumbnail,
            demoLink: 'https://ksef-master.netlify.app/',
            githubLink: 'https://github.com/Shellty-IT/KSeF-Master_backend',
            title: t('portfolio.projects.ksefMaster.title'),
            subtitle: t('portfolio.projects.ksefMaster.subtitle'),
            description: t('portfolio.projects.ksefMaster.description'),
            highlightsTitle: t('portfolio.projects.ksefMaster.highlightsTitle', { defaultValue: '' }),
            highlights: t('portfolio.projects.ksefMaster.highlights', { returnObjects: true, defaultValue: [] }),
            technologies: t('portfolio.projects.ksefMaster.tech', { returnObjects: true }),
            role: t('portfolio.projects.ksefMaster.role', { defaultValue: 'Developer' }),
            year: '2026',
            caseStudyLink: t('portfolio.projects.ksefMaster.case', { defaultValue: '' }) || null,
            testAccount: {
                noteKey: 'portfolio.testAccount.noteKsef',
                fields: [
                    { labelKey: 'login', value: 'test@testowe.pl' },
                    { labelKey: 'password', value: 'Testowe123!' },
                ],
            },
        },
        {
            id: "shelltyKanban",
            image: currentLanguage === 'en' ? kanbanThumbnailAng : kanbanThumbnail,
            demoLink: 'https://shellty-kanban.netlify.app/',
            githubLink: 'https://github.com/Shellty-IT/NerdsApp_KanbanApp',
            title: t('portfolio.projects.shelltyKanban.title'),
            subtitle: t('portfolio.projects.shelltyKanban.subtitle'),
            description: t('portfolio.projects.shelltyKanban.description'),
            highlightsTitle: t('portfolio.projects.shelltyKanban.highlightsTitle', { defaultValue: '' }),
            highlights: t('portfolio.projects.shelltyKanban.highlights', { returnObjects: true, defaultValue: [] }),
            technologies: t('portfolio.projects.shelltyKanban.tech', { returnObjects: true }),
            role: t('portfolio.projects.shelltyKanban.role', { defaultValue: 'Developer' }),
            year: '2026',
            caseStudyLink: t('portfolio.projects.shelltyKanban.case', { defaultValue: '' }) || null,
            testAccount: {
                fields: [
                    { labelKey: 'login', value: 'testowe@test.pl' },
                    { labelKey: 'password', value: 'Testowe123!' },
                ],
            },
        },
        {
            id: "shelltyPulse",
            image: shelltyPulseThumbnail,
            demoLink: 'https://shellty-pulse.onrender.com',
            githubLink: 'https://github.com/Shellty-IT/Shellty-Pulse',
            title: t('portfolio.projects.shelltyPulse.title'),
            subtitle: t('portfolio.projects.shelltyPulse.subtitle'),
            description: t('portfolio.projects.shelltyPulse.description'),
            highlightsTitle: t('portfolio.projects.shelltyPulse.highlightsTitle', { defaultValue: '' }),
            highlights: t('portfolio.projects.shelltyPulse.highlights', { returnObjects: true, defaultValue: [] }),
            technologies: t('portfolio.projects.shelltyPulse.tech', { returnObjects: true }),
            role: t('portfolio.projects.shelltyPulse.role', { defaultValue: 'Developer' }),
            year: '2026',
            caseStudyLink: t('portfolio.projects.shelltyPulse.case', { defaultValue: '' }) || null,
        },
        {
            id: "shelltyBlog",
            image: shelltyBlogThumbnail,
            demoLink: 'https://shellty-blog.onrender.com',
            githubLink: 'https://github.com/Shellty-IT/Shellty_Blog',
            videoLink: 'https://vimeo.com/1175749805',
            title: t('portfolio.projects.shelltyBlog.title'),
            subtitle: t('portfolio.projects.shelltyBlog.subtitle'),
            description: t('portfolio.projects.shelltyBlog.description'),
            highlightsTitle: t('portfolio.projects.shelltyBlog.highlightsTitle', { defaultValue: '' }),
            highlights: t('portfolio.projects.shelltyBlog.highlights', { returnObjects: true, defaultValue: [] }),
            technologies: t('portfolio.projects.shelltyBlog.tech', { returnObjects: true }),
            role: t('portfolio.projects.shelltyBlog.role', { defaultValue: 'Developer' }),
            year: '2026',
            caseStudyLink: t('portfolio.projects.shelltyBlog.case', { defaultValue: '' }) || null,
            testAccount: {
                fields: [
                    { labelKey: 'login', value: 'admin@shellty.com' },
                    { labelKey: 'password', value: 'Admin123!' },
                ],
            },
        },
        {
            id: "mobiSalon",
            image: mobisalonThumbnail,
            demoLink: 'https://mobisalon.netlify.app/',
            githubLink: 'https://github.com/Shellty-IT/mobi-grooming',
            title: t('portfolio.projects.mobiSalon.title'),
            subtitle: t('portfolio.projects.mobiSalon.subtitle'),
            description: t('portfolio.projects.mobiSalon.description'),
            highlightsTitle: t('portfolio.projects.mobiSalon.highlightsTitle', { defaultValue: '' }),
            highlights: t('portfolio.projects.mobiSalon.highlights', { returnObjects: true, defaultValue: [] }),
            technologies: t('portfolio.projects.mobiSalon.tech', { returnObjects: true }),
            role: t('portfolio.projects.mobiSalon.role', { defaultValue: 'Developer' }),
            year: '2025',
            caseStudyLink: t('portfolio.projects.mobiSalon.case', { defaultValue: '' }) || null,
        },
        {
            id: "pwaCookbook",
            image: cookbookThumbnail,
            demoLink: 'https://mobilnaksiazkakucharska.netlify.app',
            githubLink: 'https://github.com/shellty-it/Mobilna-ksiazka-kucharska',
            title: t('portfolio.projects.pwaCookbook.title'),
            subtitle: t('portfolio.projects.pwaCookbook.subtitle'),
            description: t('portfolio.projects.pwaCookbook.description'),
            technologies: t('portfolio.projects.pwaCookbook.tech', { returnObjects: true }),
            role: t('portfolio.projects.pwaCookbook.role', { defaultValue: 'Developer' }),
            year: '2021',
            caseStudyLink: t('portfolio.projects.pwaCookbook.case', { defaultValue: '' }) || null,
            testAccount: {
                fields: [
                    { labelKey: 'login', value: 'test@testowy.pl' },
                    { labelKey: 'password', value: 'Testowe123!' },
                ],
            },
        },
        {
            id: "animalsOnePage",
            image: animalsThumbnail,
            demoLink: 'https://zwierzeta.netlify.app/#fourty-page',
            githubLink: 'https://github.com/shellty-it/Strona-typu-One-Page',
            title: t('portfolio.projects.animalsOnePage.title'),
            subtitle: t('portfolio.projects.animalsOnePage.subtitle'),
            description: t('portfolio.projects.animalsOnePage.description'),
            technologies: t('portfolio.projects.animalsOnePage.tech', { returnObjects: true }),
            role: t('portfolio.projects.animalsOnePage.role', { defaultValue: 'Developer' }),
            year: '2018',
            caseStudyLink: t('portfolio.projects.animalsOnePage.case', { defaultValue: '' }) || null,
        }
    ]), [t, currentLanguage]);

    return (
        <div className="portfolio-container" id="portfolio">
            <div className="gradient-background" aria-hidden="true"></div>
            <div className="content-wrapper">
                <header className="portfolio-header animate-fade-in">
                    <div
                        ref={iconRef}
                        className={`pf-icon pf-icon--${iconPhase}`}
                    >
                        <div className="pf-icon__nodes" aria-hidden="true">
                            {ICON_NODES.map((n) => (
                                <span
                                    key={n.id}
                                    className="pf-icon__node"
                                    style={{ left: n.x, top: n.y }}
                                />
                            ))}
                        </div>
                        <img
                            src={portfolioIcon}
                            alt=""
                            aria-hidden="true"
                            className="pf-icon__img pf-icon__img--base"
                            draggable="false"
                        />
                        <img
                            src={portfolioGlow}
                            alt=""
                            aria-hidden="true"
                            className="pf-icon__img pf-icon__img--lit"
                            draggable="false"
                        />
                    </div>

                    <div
                        className="portfolio-header-hover-area"
                        onMouseEnter={() => setTitleHovered(true)}
                        onMouseLeave={() => setTitleHovered(false)}
                    >
                        <h1 className={`portfolio-title ${titleHovered ? 'hovered' : ''}`}>
                            {t('portfolio.title')}
                        </h1>
                    </div>
                    <p className="portfolio-subtitle">
                        <Trans
                            i18nKey="portfolio.subtitleHtml"
                            components={{
                                link: <a href="https://github.com/shellty-it" target="_blank" rel="noopener noreferrer" aria-label="GitHub" />,
                                pulseLink: <a href="https://shellty-pulse.onrender.com" target="_blank" rel="noopener noreferrer" className="warning-glow" />,
                                warning: <span className="warning-glow" />
                            }}
                        />
                    </p>
                </header>

                <section className="projects-grid" aria-live="polite">
                    {projects.map((project, index) => (
                        <article
                            key={project.id}
                            className={`project-card animate-slide-up delay-${index + 1}`}
                            itemScope
                            itemType="https://schema.org/CreativeWork"
                        >
                            {project.image && (
                                <div className="project-image-wrapper">
                                    <ProjectImage
                                        src={project.image}
                                        alt={project.title}
                                    />
                                    <div className="image-overlay">
                                        {project.demoLink && (
                                            <a
                                                href={project.demoLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="overlay-cta"
                                                aria-label={`${t('portfolio.actions.demo')} — ${project.title}`}
                                            >
                                                <FaExternalLinkAlt /> {t('portfolio.actions.demo')}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="project-content">
                                <header className="project-header">
                                    <h3 className="project-heading" itemProp="name">{project.title}</h3>
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
                                            <a href={project.demoLink} target="_blank" rel="noopener noreferrer" className="project-link">
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
            />
        </div>
    );
};

export default Portfolio;
