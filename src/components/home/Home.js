// src/components/home/Home.js
import React, { useEffect, useState } from "react";
import "./Home.css";
import { HashLink } from 'react-router-hash-link';
import { useTranslation } from "react-i18next";
import LogoSVG from "../../assets/logo/logo_vertical";
import CtaButton from "../ctaButton/CtaButton";

import portfolioIcon from '../../assets/icons/portfolio/portfolio_cta.webp';
import portfolioGlowIcon from '../../assets/icons/portfolio/portfolio_cta_glow.webp';
import contactIcon from '../../assets/icons/contact/contact_cta.webp';
import contactGlowIcon from '../../assets/icons/contact/contact_cta_glow.webp';
import servicesIcon from '../../assets/icons/services/services.webp';
import servicesRotating from '../../assets/icons/services/services_rotating.webp';
import servicesCenter from '../../assets/icons/services/services_center.webp';

export default function Home() {
    const { t } = useTranslation();
    const [logoGlow, setLogoGlow]   = useState(false);

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
                        <span>{t("home.headline.primary")}</span><br />
                        <span className="gradient-text">{t("home.headline.secondary")}</span>
                    </h1>

                    <p className="hero__profile">
                        <span className="hero__profile-name">{t("home.profile.name")}</span>
                        <span className="hero__profile-roles">{t("home.profile.roles")}</span>
                    </p>

                    <div className="hero__lead">
                        <p>
                            <strong>{t("home.intro.question")}</strong>{" "}
                            {t("home.intro.answer")}
                        </p>
                        <p className="hero__collaboration">
                            {t("home.intro.collaboration")}
                        </p>
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
                            <div className="stat__num">{t("home.stats.hybrid.num")}</div>
                            <div className="stat__label">{t("home.stats.hybrid.label")}</div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="hero__cta">
                        <CtaButton
                            to="/portfolio/#portfolio"
                            variant="primary"
                            icon={portfolioIcon}
                            iconGlow={portfolioGlowIcon}
                            kicker={t("home.cta.portfolioKicker")}
                            title={t("home.cta.portfolioTitle")}
                            arrow
                        />

                        <CtaButton
                            to="/contact/#contact"
                            icon={contactIcon}
                            iconGlow={contactGlowIcon}
                            kicker={t("home.cta.contactKicker")}
                            title={t("home.cta.contactTitle")}
                        />
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
