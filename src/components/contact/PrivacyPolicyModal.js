// src/components/contact/PrivacyPolicyModal.js
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./PrivacyPolicyModal.css";

function PolicySection({ section, email }) {
    return (
        <section className="pp-section">
            <h3 className="pp-section__title">{section.title}</h3>
            {section.paragraphs?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
            ))}
            {section.items && (
                <ul className="pp-list">
                    {section.items.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            )}
            {section.after?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
            ))}
            {section.links && (
                <ul className="pp-list">
                    {section.links.map(({ label, href }) => (
                        <li key={href}>
                            <a href={href} className="pp-link" target="_blank" rel="noopener noreferrer">
                                {label}
                            </a>
                        </li>
                    ))}
                </ul>
            )}
            {section.contact && (
                <p>
                    {section.contact}{" "}
                    <a href={`mailto:${email}`} className="pp-link">
                        {email}
                    </a>
                </p>
            )}
        </section>
    );
}

export default function PrivacyPolicyModal({ onClose }) {
    const { t } = useTranslation();
    const overlayRef = useRef(null);
    const modalRef = useRef(null);

    useEffect(() => {
        const previouslyFocused = document.activeElement;
        modalRef.current?.focus();

        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
            previouslyFocused?.focus();
        };
    }, [onClose]);

    const handleOverlayClick = (e) => {
        if (e.target === overlayRef.current) onClose();
    };

    const pp = t("privacyPolicy", { returnObjects: true });

    return createPortal(
        <div
            className="pp-overlay"
            ref={overlayRef}
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pp-title"
        >
            <div
                className="pp-modal"
                ref={modalRef}
                tabIndex={-1}
            >
                <div className="pp-modal__header">
                    <h2 id="pp-title" className="pp-modal__title">{pp.title}</h2>
                    <p className="pp-modal__updated">{pp.updated}</p>
                    <button
                        className="pp-modal__close"
                        onClick={onClose}
                        aria-label={pp.closeAria}
                    >
                        ✕
                    </button>
                </div>

                <div className="pp-modal__body">
                    {pp.sections.map((section) => (
                        <PolicySection key={section.title} section={section} email={pp.email} />
                    ))}
                </div>

                <div className="pp-modal__footer">
                    <button className="pp-modal__close-btn" onClick={onClose}>
                        {pp.closeBtn}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
