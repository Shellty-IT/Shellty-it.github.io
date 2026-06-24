// src/components/about/About.js
import React, { useState, useEffect, useCallback } from "react";
import { HashLink } from "react-router-hash-link";
import "./About.css";
import {
    FaMapMarkerAlt,
    FaBriefcase,
    FaLanguage,
    FaEnvelope,
    FaGithub,
    FaLinkedin,
    FaGraduationCap,
} from "react-icons/fa";
import { useTranslation, Trans } from "react-i18next";
import GlowIcon from "../glowIcon/GlowIcon";
import { useIconPhase } from "../../hooks/useIconPhase";

import aboutIcon from "../../assets/icons/about/about.webp";
import aboutGlow from "../../assets/icons/about/about_glow.webp";
import portfolioIcon from "../../assets/icons/portfolio/portfolio.webp";
import portfolioGlow from "../../assets/icons/portfolio/portfolio_glow.webp";
import contactIcon from "../../assets/icons/contact/contact.webp";
import contactGlow from "../../assets/icons/contact/contact_glow.webp";

import responsibilityIcon from "../../assets/icons/responsibility/responsibility.webp";
import responsibilityGlow from "../../assets/icons/responsibility/responsibility_glow.webp";
import passionIcon from "../../assets/icons/passion/passion.webp";
import passionGlow from "../../assets/icons/passion/passion_glow.webp";
import teamworkIcon from "../../assets/icons/teamwork/teamwork.webp";
import teamworkGlow from "../../assets/icons/teamwork/teamwork_glow.webp";
import independenceIcon from "../../assets/icons/independence/independence.webp";
import independenceGlow from "../../assets/icons/independence/independence_glow.webp";
import creativityIcon from "../../assets/icons/creativity/creativity.webp";
import creativityGlow from "../../assets/icons/creativity/creativity_glow.webp";
import flexibilityIcon from "../../assets/icons/flexibility/flexibility.webp";
import flexibilityGlow from "../../assets/icons/flexibility/flexibility_glow.webp";

const TRAITS_DATA = [
    { key: "responsibility", icon: responsibilityIcon, glow: responsibilityGlow },
    { key: "passion",        icon: passionIcon,        glow: passionGlow },
    { key: "teamwork",       icon: teamworkIcon,       glow: teamworkGlow },
    { key: "independence",   icon: independenceIcon,   glow: independenceGlow },
    { key: "creativity",     icon: creativityIcon,     glow: creativityGlow },
    { key: "flexibility",    icon: flexibilityIcon,    glow: flexibilityGlow },
];

const DNA_STARS = [
    { id: 0, x: "18%", y: "22%" },
    { id: 1, x: "72%", y: "15%" },
    { id: 2, x: "45%", y: "50%" },
    { id: 3, x: "28%", y: "75%" },
    { id: 4, x: "80%", y: "65%" },
    { id: 5, x: "55%", y: "85%" },
    { id: 6, x: "12%", y: "48%" },
    { id: 7, x: "88%", y: "38%" },
];

/* ─── TraitItem ─── */
const TraitItem = ({ traitKey, icon, iconGlow, isMobile, onMobileTap, t }) => {
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);

    const isActive    = hovered || focused;
    const showTooltip = !isMobile && isActive;
    const tooltipId   = `trait-tip-${traitKey}`;

    return (
        <button
            type="button"
            className={`trait-item${isActive ? " trait-item--active" : ""}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onClick={() => { if (isMobile) onMobileTap(traitKey); }}
            onKeyDown={(e) => {
                if (e.key === "Escape") {
                    setFocused(false);
                    e.target.blur();
                }
            }}
            aria-describedby={showTooltip ? tooltipId : undefined}
        >
            <img
                src={isActive ? iconGlow : icon}
                alt=""
                aria-hidden="true"
                className="trait-item__icon"
                width="84"
                height="84"
            />
            <span className="trait-item__label">
                {t(`about.traits.${traitKey}.name`)}
            </span>
            {!isMobile && (
                <span
                    role="tooltip"
                    id={tooltipId}
                    className={`trait-item__tooltip${
                        showTooltip ? " trait-item__tooltip--visible" : ""
                    }`}
                >
                    {t(`about.traits.${traitKey}.desc`)}
                </span>
            )}
        </button>
    );
};

/* ─── TraitBottomSheet ─── */
const TraitBottomSheet = ({ traitKey, iconGlow, onClose, t }) => {
    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [onClose]);

    return (
        <div
            className="trait-sheet-overlay"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="trait-sheet"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label={t(`about.traits.${traitKey}.name`)}
            >
                <div className="trait-sheet__handle" />
                <button
                    className="trait-sheet__close"
                    onClick={onClose}
                    aria-label={t("about.traits.closeAria")}
                >
                    ×
                </button>
                <div className="trait-sheet__header">
                    <img
                        src={iconGlow}
                        alt=""
                        aria-hidden="true"
                        className="trait-sheet__icon"
                        width="32"
                        height="32"
                    />
                    <span className="trait-sheet__name">
                        {t(`about.traits.${traitKey}.name`)}
                    </span>
                </div>
                <p className="trait-sheet__desc">
                    {t(`about.traits.${traitKey}.desc`)}
                </p>
            </div>
        </div>
    );
};

const VideoCard = ({ vimeoId, t }) => {
    const [playing, setPlaying]       = useState(false);
    const [thumbError, setThumbError] = useState(false);

    useEffect(() => {
        setPlaying(false);
        setThumbError(false);
    }, [vimeoId]);

    return (
        <div className="about__video-card">
            <div className="about__video-wrapper">
                {!playing ? (
                    <button
                        className="about__video-play"
                        onClick={() => setPlaying(true)}
                        aria-label={t("about.video.playAria")}
                    >
                        {!thumbError && (
                            <img
                                src={`https://vumbnail.com/${vimeoId}.jpg`}
                                alt=""
                                className="about__video-thumb"
                                loading="lazy"
                                width="1280"
                                height="720"
                                onError={() => setThumbError(true)}
                            />
                        )}
                        <span
                            className="about__video-play-icon"
                            aria-hidden="true"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                width="24"
                                height="24"
                            >
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </span>
                        {/* USUNIĘTO: about__video-label */}
                    </button>
                ) : (
                    <iframe
                        src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0`}
                        title={t("about.video.iframeTitle")}
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        className="about__video-iframe"
                    />
                )}
            </div>
        </div>
    );
};

/* ─── About (główny komponent) ─── */
const About = () => {
    const { t } = useTranslation();
    const vimeoId = t("about.video.vimeoId");

    const [isMobile, setIsMobile]           = useState(false);
    const [mobileSheetKey, setMobileSheetKey] = useState(null);

    useEffect(() => {
        const mql = window.matchMedia("(hover: none)");
        setIsMobile(mql.matches);
        const handler = (e) => setIsMobile(e.matches);
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, []);

    const closeMobileSheet = useCallback(() => setMobileSheetKey(null), []);

    const activeSheetTrait = mobileSheetKey
        ? TRAITS_DATA.find((tr) => tr.key === mobileSheetKey)
        : null;

    const [titleHovered, setTitleHovered] = useState(false);
    const { iconRef, iconPhase } = useIconPhase("dna--pulse");

    return (
        <section id="about" className="about">

            <div className="about__container">

                {/* ── Header sekcji ── */}
                <header className="about__header">

                    {/* Ikona sekcji — floating DNA (bez zmian) */}
                    <div
                        ref={iconRef}
                        className={`dna dna--${iconPhase}`}
                        aria-hidden="true"
                    >
                        <div className="dna__stars" aria-hidden="true">
                            {DNA_STARS.map((s) => (
                                <span
                                    key={s.id}
                                    className="dna__star"
                                    style={{ left: s.x, top: s.y }}
                                />
                            ))}
                        </div>
                        <img
                            src={aboutIcon}
                            alt=""
                            aria-hidden="true"
                            className="dna__img dna__img--base"
                            draggable="false"
                            width="200"
                            height="200"
                        />
                        <img
                            src={aboutGlow}
                            alt=""
                            aria-hidden="true"
                            className="dna__img dna__img--lit"
                            draggable="false"
                            width="200"
                            height="200"
                        />
                    </div>

                    {/* Tytuł sekcji */}
                    <div
                        className="about__header-hover-area"
                        onMouseEnter={() => setTitleHovered(true)}
                        onMouseLeave={() => setTitleHovered(false)}
                    >
                        <h1 className={`about__title${titleHovered ? " hovered" : ""}`}>
                            {t("about.title")}
                        </h1>
                    </div>

                </header>

                {/* ── Grid ── */}
                <div className="about__grid">

                    {/* LEWA: tekst */}
                    <div className="about__text">

                        <p>
                            <Trans
                                i18nKey="about.p1"
                                components={{ strong: <strong /> }}
                            />
                        </p>

                        <p className="about__video-invite">
                            🎬&ensp;{t("about.videoInvite")}
                            <span className="about__video-dir--desktop">
                                {t("about.videoInviteDirDesktop")}
                            </span>
                            <span className="about__video-dir--mobile">
                                {t("about.videoInviteDirMobile")}
                            </span>
                        </p>

                        <h2 className="about__subhead">
                            <strong>{t("about.approachTitle")}</strong>
                        </h2>
                        <p>
                            <Trans i18nKey="about.approachIntro" />
                        </p>

                        <ul className="about__bullets">
                            <li>
                                <Trans
                                    i18nKey="about.points.design"
                                    components={{ strong: <strong /> }}
                                />
                            </li>
                            <li>
                                <Trans
                                    i18nKey="about.points.deploy"
                                    components={{ strong: <strong /> }}
                                />
                            </li>
                            <li>
                                <Trans
                                    i18nKey="about.points.support"
                                    components={{ strong: <strong /> }}
                                />
                            </li>
                        </ul>

                        <h2 className="about__subhead">
                            <strong>{t("about.growthTitle")}</strong>
                        </h2>
                        <p>
                            <Trans i18nKey="about.growth" />
                        </p>

                        <h2 className="about__subhead">
                            <strong>{t("about.goalTitle")}</strong>
                        </h2>
                        <p>
                            <Trans i18nKey="about.goal" />
                        </p>

                        {/* Przyciski */}
                        <div className="about__actions">
                            <HashLink
                                smooth
                                to="/portfolio/#portfolio"
                                className="btn btn--primary"
                            >
                                <GlowIcon
                                    src={portfolioIcon}
                                    srcGlow={portfolioGlow}
                                    alt=""
                                    size={42}
                                    className="btn-glow-icon btn-glow-icon--portfolio"
                                />
                                {t("nav.portfolio")}
                            </HashLink>

                            <HashLink
                                smooth
                                to="/contact/#contact"
                                className="btn btn--outline btn--contact"
                            >
                                <GlowIcon
                                    src={contactIcon}
                                    srcGlow={contactGlow}
                                    alt=""
                                    size={42}
                                    className="btn-glow-icon btn-glow-icon--contact"
                                />
                                {t("about.ctaContact")}
                            </HashLink>
                        </div>

                        {/* Social */}
                        <div className="about__social" aria-label="Social">
                            <a
                                href="mailto:crispy.it.office@gmail.com"
                                aria-label={t("about.social.emailAria")}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <FaEnvelope />
                            </a>
                            <a
                                href="https://github.com/shellty-IT"
                                aria-label={t("about.social.githubAria")}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <FaGithub />
                            </a>
                            <a
                                href="https://www.linkedin.com/in/tomasz-skorupski-a078ba389"
                                aria-label={t("about.social.linkedinAria")}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <FaLinkedin />
                            </a>
                        </div>

                    </div>

                    {/* PRAWA: sidebar */}
                    <aside className="about__sidebar">

                        {/* Wideo */}
                        <VideoCard vimeoId={vimeoId} t={t} />

                        {/* Karta faktów */}
                        <div className="about__card">

                            {/* Fakty */}
                            <div className="about__fact">
                                <span className="ic">
                                    <FaMapMarkerAlt />
                                </span>
                                <div>
                                    <h4>{t("about.facts.locationTitle")}</h4>
                                    <p>{t("about.facts.locationValue")}</p>
                                </div>
                            </div>

                            <div className="about__fact">
                                <span className="ic">
                                    <FaBriefcase />
                                </span>
                                <div>
                                    <h4>{t("about.facts.statusTitle")}</h4>
                                    <p>{t("about.facts.statusValue")}</p>
                                </div>
                            </div>

                            <div className="about__fact">
                                <span className="ic">
                                    <FaLanguage />
                                </span>
                                <div>
                                    <h4>{t("about.facts.languagesTitle")}</h4>
                                    <p>{t("about.facts.languagesValue")}</p>
                                </div>
                            </div>

                            <div className="about__fact">
                                <span className="ic">
                                    <FaGraduationCap />
                                </span>
                                <div>
                                    <h4>{t("about.facts.educationTitle")}</h4>
                                    <p>
                                        <a
                                            href={t("about.facts.educationUrl")}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {t("about.facts.educationValue")}
                                        </a>
                                    </p>
                                </div>
                            </div>

                            {/* Certyfikaty */}
                            <div className="about__certs-block">
                                <h4>{t("about.facts.certsTitle")}</h4>
                                <ul className="certs-list">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                        <li key={n}>
                                            <a
                                                href={t(`about.facts.cert${n}Url`)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {t(`about.facts.cert${n}Name`)}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Cechy */}
                            <div className="about__traits-block">
                                <h4 className="about__traits-title">
                                    {t("about.softSkillsTitle")}
                                </h4>
                                <div className="traits-grid">
                                    {TRAITS_DATA.map((trait) => (
                                        <TraitItem
                                            key={trait.key}
                                            traitKey={trait.key}
                                            icon={trait.icon}
                                            iconGlow={trait.glow}
                                            isMobile={isMobile}
                                            onMobileTap={setMobileSheetKey}
                                            t={t}
                                        />
                                    ))}
                                </div>
                            </div>

                        </div>
                        {/* /about__card */}

                    </aside>

                </div>
                {/* /about__grid */}

            </div>
            {/* /about__container */}

            {/* Mobile bottom sheet */}
            {isMobile && activeSheetTrait && (
                <TraitBottomSheet
                    traitKey={activeSheetTrait.key}
                    iconGlow={activeSheetTrait.glow}
                    onClose={closeMobileSheet}
                    t={t}
                />
            )}

        </section>
    );
};

export default About;
