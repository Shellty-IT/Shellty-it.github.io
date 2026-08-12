// src/components/ctaButton/CtaButton.js
import React from "react";
import { HashLink } from "react-router-hash-link";
import "./CtaButton.css";

/**
 * Główne CTA używane w hero i w sekcji bio.
 * Ikona ma dwa warianty: bazowy (wygaszony) i glow - przełączane na hover.
 */
const CtaButton = ({
    to,
    variant = "ghost",
    icon,
    iconGlow,
    kicker,
    title,
    arrow = false,
}) => (
    <HashLink smooth to={to} className={`btn-cta btn-cta--${variant}`}>
        <span className="btn-cta__bg" aria-hidden="true" />
        <span className="btn-cta__icon" aria-hidden="true">
            <img src={icon} alt="" className="btn-cta__icon-base" width="38" height="38" />
            <img src={iconGlow} alt="" className="btn-cta__icon-lit" width="38" height="38" />
        </span>
        <span className="btn-cta__text">
            <span className="btn-cta__kicker">{kicker}</span>
            <span className="btn-cta__title">{title}</span>
        </span>
        {arrow && (
            <span className="btn-cta__arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M13.2 5.2 12 6.4l4.6 4.6H4v2h12.6L12 17.6l1.2 1.2 6.8-6.8z" />
                </svg>
            </span>
        )}
    </HashLink>
);

export default CtaButton;
