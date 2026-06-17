// src/components/home/Home.js
import React, { useEffect, useState } from "react";
import "./Home.css";
import { HashLink } from 'react-router-hash-link';
import { useTranslation } from "react-i18next";
import LogoSVG from "../../assets/logo/logo_vertical";

import cvIcon from '../../assets/icons/cv/cv.webp';
import cvGlowIcon from '../../assets/icons/cv/cv_glow.webp';
import portfolioIcon from '../../assets/icons/portfolio/portfolio.webp';
import portfolioGlowIcon from '../../assets/icons/portfolio/portfolio_glow.webp';
import contactIcon from '../../assets/icons/contact/contact.webp';
import contactGlowIcon from '../../assets/icons/contact/contact_glow.webp';

const ROLES_PL = [
    "Specjalista IT",
    "SysAdmin",
    "Software Developer",
    "Software Engineer",
    "DevOps Engineer",
    "Freelancer",
    "Programista",
    "Administrator Baz Danych",
];

const ROLES_EN = [
    "IT Specialist",
    "SysAdmin",
    "Software Developer",
    "Software Engineer",
    "DevOps Engineer",
    "Freelancer",
    "Programmer",
    "Database Administrator",
];

export default function Home() {
    const { t, i18n } = useTranslation();
    const isEN = i18n.language?.startsWith("en");
    const ROLES = isEN ? ROLES_EN : ROLES_PL;

    const [subIndex, setSubIndex]   = useState(0);
    const [roleIndex, setRoleIndex] = useState(0);
    const [reverse, setReverse]     = useState(false);
    const [blink, setBlink]         = useState(true);
    const [logoGlow, setLogoGlow]   = useState(false);

    useEffect(() => {
        setSubIndex(0);
        setRoleIndex(0);
        setReverse(false);
    }, [isEN]);

    useEffect(() => {
        if (reverse) {
            if (subIndex === 0) {
                setReverse(false);
                setRoleIndex((prev) => (prev + 1) % ROLES.length);
                return;
            }
        } else if (subIndex === ROLES[roleIndex].length + 1) {
            const tmo = setTimeout(() => setReverse(true), 950);
            return () => clearTimeout(tmo);
        }

        const timeout = setTimeout(() => {
            setSubIndex((prev) => prev + (reverse ? -1 : 1));
        }, reverse ? 38 : 85);

        return () => clearTimeout(timeout);
    }, [subIndex, roleIndex, reverse, ROLES]);

    useEffect(() => {
        const blinkTimer = setInterval(() => setBlink((b) => !b), 420);
        return () => clearInterval(blinkTimer);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setLogoGlow(true);
            setTimeout(() => setLogoGlow(false), 1500);
        }, 7000);
        return () => clearInterval(interval);
    }, []);

    const CV_FILE_PL = 'CV_PL_public.pdf';
    const CV_FILE_EN = 'CV_ANG_public.pdf';
    const CV_FILE = isEN ? CV_FILE_EN : CV_FILE_PL;

    const GITHUB_CV_RAW = `https://raw.githubusercontent.com/Shellty-IT/Shellty-IT.github.io/main/public/cv/${CV_FILE}`;
    const GITHUB_CV_CDN = `https://cdn.jsdelivr.net/gh/Shellty-IT/Shellty-IT.github.io@main/public/cv/${CV_FILE}`;

    const downloadCV = async (e) => {
        e.preventDefault();
        const tryDownload = async (url) => {
            const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const objUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objUrl;
            a.download = CV_FILE;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(objUrl);
        };

        try {
            await tryDownload(GITHUB_CV_RAW);
        } catch (_) {
            try {
                await tryDownload(GITHUB_CV_CDN);
            } catch {
                window.open(GITHUB_CV_RAW, '_blank', 'noopener,noreferrer');
            }
        }
    };

    return (
        <section id="home" className="home">
            <div className="aurora" aria-hidden="true" />
            <div className="stars" aria-hidden="true" />

            <div className="home__inner">

                {/* LEWA: hero */}
                <div className="hero">

                    <h1 className="hero__title">
                        {t("home.greeting")}<br />
                        <span className="gradient-text">{t("home.name")}</span>
                    </h1>

                    <h2 className="hero__subtitle">
                        {ROLES[roleIndex].substring(0, subIndex)}
                        <span className={`caret ${blink ? "is-on" : ""}`} />
                    </h2>

                    <p className="hero__lead">
                        {t("home.lead")}
                    </p>

                    {/* CTA */}
                    <div className="hero__cta">
                        <HashLink
                            className="btn-glass btn-glass--primary"
                            smooth
                            to="/portfolio#portfolio"
                        >
                            <span className="btn-icon-wrap btn-icon-wrap--portfolio">
                                <img src={portfolioIcon} alt="" className="btn-icon btn-icon--default" width="22" height="22" />
                                <img src={portfolioGlowIcon} alt="" className="btn-icon btn-icon--glow" width="22" height="22" />
                            </span>
                            <span>{t("home.ctaPortfolio")}</span>
                        </HashLink>

                        <a
                            className="btn-glass"
                            href={GITHUB_CV_RAW}
                            onClick={downloadCV}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <span className="btn-icon-wrap btn-icon-wrap--cv">
                                <img src={cvIcon} alt="" className="btn-icon btn-icon--default" width="22" height="22" />
                                <img src={cvGlowIcon} alt="" className="btn-icon btn-icon--glow" width="22" height="22" />
                            </span>
                            <span>{t("home.ctaCv")}</span>
                        </a>

                        <HashLink
                            className="btn-glass"
                            smooth
                            to="/contact#contact"
                        >
                            <span className="btn-icon-wrap btn-icon-wrap--contact">
                                <img src={contactIcon} alt="" className="btn-icon btn-icon--default" width="22" height="22" />
                                <img src={contactGlowIcon} alt="" className="btn-icon btn-icon--glow" width="22" height="22" />
                            </span>
                            <span>{t("home.ctaContact")}</span>
                        </HashLink>
                    </div>

                    {/* Meta stats */}
                    <div className="hero__meta">
                        <div className="stat">
                            <div className="stat__num">{t("home.stats.years.num")}</div>
                            <div className="stat__label">{t("home.stats.years.label")}</div>
                        </div>
                        <div className="stat">
                            <div className="stat__num">{t("home.stats.projects.num")}</div>
                            <div className="stat__label">{t("home.stats.projects.label")}</div>
                        </div>
                        <div className="stat">
                            <div className="stat__num">{t("home.stats.english.num")}</div>
                            <div className="stat__label">{t("home.stats.english.label")}</div>
                        </div>
                    </div>

                    {/* Quick contact */}
                    <div className="quick-contact">
                        <a
                            className="chip"
                            href="mailto:shellty@zohomail.eu"
                            aria-label={t("home.contact.emailAria")}
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="chip-icon">
                                <path
                                    fill="currentColor"
                                    d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4.236-6.928 4.334a2 2 0 0 1-2.144 0L4 8.236V6l8 5 8-5v2.236Z"
                                />
                            </svg>
                            <span>shellty@zohomail.eu</span>
                        </a>

                        <a
                            className="chip"
                            href="https://github.com/Shellty-IT"
                            target="_blank"
                            rel="noreferrer"
                            aria-label={t("home.contact.githubAria")}
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="chip-icon">
                                <path
                                    fill="currentColor"
                                    d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.6-3.37-1.34-3.37-1.34-.46-1.17-1.12-1.48-1.12-1.48-.92-.62.07-.6.07-.6 1.02.07 1.56 1.05 1.56 1.05 .91 1.56 2.39 1.11 2.97.85.09-.66.36-1.11.65-1.37-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.57 9.57 0 0 1 12 6.84c.85 0 1.7.11 2.5.32 1.9-1.29 2.74-1.02 2.74-1.02 .55 1.38.2 2.4.1 2.65.64.7 1.02 1.59 1.02 2.68 0 3.85-2.34 4.7-4.57 4.95.37.32.69.94.69 1.9 0 1.37-.01 2.47-.01 2.8 0 .26.18.57.69.47A10 10 0 0 0 12 2Z"
                                />
                            </svg>
                            <span>GitHub</span>
                        </a>
                    </div>

                </div>

                {/* PRAWA: visual */}
                <div className="hero-visual">
                    <div className="visual-orb" aria-hidden="true" />

                    <div className="visual-card">
                        <div className={`logo-auto-glow${logoGlow ? ' is-glowing' : ''}`}>
                            <div className="logo-container">
                                <LogoSVG />
                            </div>
                        </div>

                        <div className="visual-logo-text">
                            <span className="visual-logo-shell">Shell</span>
                            <span className="visual-logo-ty">ty</span>
                        </div>

                        <div className="visual-caption">
                            {t("home.caption")}
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}