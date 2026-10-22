// src/components/ctaButton/CtaButton.js
import React from "react";
import { HashLink } from "react-router-hash-link";
import "./CtaButton.css";

const ArrowIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M13.2 5.2 12 6.4l4.6 4.6H4v2h12.6L12 17.6l1.2 1.2 6.8-6.8z" />
    </svg>
);

const setRevealOrigin = (event) => {
    if (event.pointerType === "touch") return;

    const button = event.currentTarget;
    const bounds = button.getBoundingClientRect();
    const background = button.firstElementChild;
    const isFocus = event.type === "focus";
    const x = isFocus ? bounds.width / 2 : Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
    const y = isFocus ? bounds.height / 2 : Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
    // Reach the farthest corner at the end, even when entering near the centre.
    const radius = Math.hypot(Math.max(x, bounds.width - x), Math.max(y, bounds.height - y)) + 2;
    // Keep these inherited properties off the text, icons and arrow subtree.
    background.style.setProperty("--reveal-x", `${x}px`);
    background.style.setProperty("--reveal-y", `${y}px`);
    background.style.setProperty("--reveal-size", `${2 * radius}px`);
};

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
    hoverReveal = false,
    hoverArrow = false,
    className = "",
}) => (
    <HashLink
        smooth
        to={to}
        className={`btn-cta btn-cta--${variant}${hoverReveal ? " btn-cta--reveal" : ""}${hoverReveal || hoverArrow ? " btn-cta--arrow-swap" : ""}${className ? ` ${className}` : ''}`}
        onPointerEnter={hoverReveal ? setRevealOrigin : undefined}
        onFocus={hoverReveal ? setRevealOrigin : undefined}
    >
        <span className="btn-cta__bg" aria-hidden="true" />
        <span className="btn-cta__icon" aria-hidden="true">
            <img src={icon} alt="" className="btn-cta__icon-base" width="38" height="38" />
            <span className="btn-cta__icon-lit">
                {(Array.isArray(iconGlow) ? iconGlow : [iconGlow]).map((src) => (
                    <img key={src} src={src} alt="" width="38" height="38" />
                ))}
            </span>
        </span>
        <span className="btn-cta__text">
            {(hoverReveal || hoverArrow) && arrow && (
                <span className="btn-cta__arrow-in" aria-hidden="true"><ArrowIcon /></span>
            )}
            <span className="btn-cta__kicker">{kicker}</span>
            <span className="btn-cta__title">{title}</span>
        </span>
        {arrow && (
            <span className="btn-cta__arrow" aria-hidden="true">
                <ArrowIcon />
            </span>
        )}
    </HashLink>
);

export default CtaButton;
