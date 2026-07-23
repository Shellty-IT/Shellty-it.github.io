// src/components/home/Home.js
import React, { useEffect, useState } from "react";
import "./Home.css";
import { HashLink } from 'react-router-hash-link';
import { useTranslation } from "react-i18next";
import LogoSVG from "../../assets/logo/logo_vertical";

import portfolioIcon from '../../assets/icons/portfolio/portfolio.webp';
import portfolioGlowIcon from '../../assets/icons/portfolio/portfolio_glow.webp';
import contactIcon from '../../assets/icons/contact/contact.webp';
import contactGlowIcon from '../../assets/icons/contact/contact_glow.webp';
import servicesIcon from '../../assets/icons/services/services.webp';
import servicesRotating from '../../assets/icons/services/services_rotating.webp';
import servicesCenter from '../../assets/icons/services/services_center.webp';

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
                            <div className="stat__num">{t("home.stats.hybrid.num")}</div>
                            <div className="stat__label">{t("home.stats.hybrid.label")}</div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="hero__cta">
                        <HashLink
                            className="btn-glass btn-glass--primary"
                            smooth
                            to="/portfolio/#portfolio"
                        >
                            <span className="btn-icon-wrap btn-icon-wrap--portfolio">
                                <img src={portfolioIcon} alt="" className="btn-icon btn-icon--default" width="22" height="22" />
                                <img src={portfolioGlowIcon} alt="" className="btn-icon btn-icon--glow" width="22" height="22" />
                            </span>
                            <span>{t("home.ctaPortfolio")}</span>
                        </HashLink>

                        <HashLink
                            className="btn-glass"
                            smooth
                            to="/contact/#contact"
                        >
                            <span className="btn-icon-wrap btn-icon-wrap--contact">
                                <img src={contactIcon} alt="" className="btn-icon btn-icon--default" width="22" height="22" />
                                <img src={contactGlowIcon} alt="" className="btn-icon btn-icon--glow" width="22" height="22" />
                            </span>
                            <span>{t("home.ctaContact")}</span>
                        </HashLink>
                    </div>

                    {/* Zajawka usług */}
                    <HashLink
                        className="services-teaser"
                        smooth
                        to="/services/#services"
                    >
                        <span className="services-teaser__icon" aria-hidden="true">
                            <img src={servicesIcon} alt="" className="services-teaser__icon-base" width="64" height="64" />
                            <img src={servicesRotating} alt="" className="services-teaser__icon-rotating" width="64" height="64" />
                            <img src={servicesCenter} alt="" className="services-teaser__icon-center" width="64" height="64" />
                        </span>
                        <span className="services-teaser__text">
                            <span className="services-teaser__kicker">{t("home.servicesTeaser.kicker")}</span>
                            <span className="services-teaser__title">{t("home.servicesTeaser.title")}</span>
                            <span className="services-teaser__sub">{t("home.servicesTeaser.sub")}</span>
                        </span>
                        <span className="services-teaser__arrow" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M13.2 5.2 12 6.4l4.6 4.6H4v2h12.6L12 17.6l1.2 1.2 6.8-6.8z" />
                            </svg>
                        </span>
                    </HashLink>

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
