// src/components/home/Home.js
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./Home.css";
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
    const [logoGlow, setLogoGlow] = useState(false);
    const titleRef = useRef(null);
    const primaryHeadline = t("home.headline.primary");
    const secondaryHeadline = t("home.headline.secondary");

    useLayoutEffect(() => {
        const title = titleRef.current;
        let active = true;

        const fitTitle = () => {
            if (!active) return;
            if (window.matchMedia("(max-width: 560px)").matches) {
                title.style.removeProperty("--hero-title-size");
                return;
            }

            const widestLine = Math.max(...Array.from(title.children,
                line => line.getBoundingClientRect().width));
            if (!widestLine || title.clientWidth <= 1) return;

            const currentSize = parseFloat(getComputedStyle(title).fontSize);
            const fittedSize = Math.floor(currentSize * (title.clientWidth - 1) / widestLine * 10) / 10;
            title.style.setProperty("--hero-title-size", `${fittedSize}px`);
        };

        fitTitle();
        const observer = new ResizeObserver(fitTitle);
        observer.observe(title);
        document.fonts.ready.then(fitTitle);
        document.fonts.addEventListener("loadingdone", fitTitle);

        return () => {
            active = false;
            observer.disconnect();
            document.fonts.removeEventListener("loadingdone", fitTitle);
        };
    }, [primaryHeadline, secondaryHeadline]);

    useEffect(() => {
        let glowTimeout;
        const interval = setInterval(() => {
            setLogoGlow(true);
            glowTimeout = setTimeout(() => setLogoGlow(false), 1500);
        }, 7000);

        return () => {
            clearInterval(interval);
            clearTimeout(glowTimeout);
        };
    }, []);

    return (
        <section id="home" className="home">
            <div className="aurora" aria-hidden="true" />
            <div className="stars" aria-hidden="true" />

            <div className="home__inner">

                {/* LEWA: hero */}
                <div className="hero">

                    <h1 className="hero__title" ref={titleRef}>
                        <span className="hero__title-line">{primaryHeadline}</span>
                        <span className="hero__title-line gradient-text">{secondaryHeadline}</span>
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

                    <CtaButton
                        className="hero__services-link"
                        to="/services/#services"
                        icon={servicesIcon}
                        iconGlow={[servicesRotating, servicesCenter]}
                        kicker={t("home.cta.servicesKicker")}
                        title={t("home.cta.servicesTitle")}
                        hoverReveal
                        arrow
                    />

                    {/* CTA */}
                    <div className="hero__cta">
                        <CtaButton
                            to="/portfolio/#portfolio"
                            icon={portfolioIcon}
                            iconGlow={portfolioGlowIcon}
                            kicker={t("home.cta.portfolioKicker")}
                            title={t("home.cta.portfolioTitle")}
                            hoverArrow
                            arrow
                        />

                        <CtaButton
                            to="/contact/#contact"
                            icon={contactIcon}
                            iconGlow={contactGlowIcon}
                            kicker={t("home.cta.contactKicker")}
                            title={t("home.cta.contactTitle")}
                            hoverArrow
                            arrow
                        />
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

                </div>

                {/* PRAWA: visual */}
                <div className="hero-visual">
                    <div className="visual-orb" aria-hidden="true" />

                    <div className="visual-card">
                        <div className={`logo-auto-glow${logoGlow ? ' is-glowing' : ''}`}>
                            <LogoSVG />
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
