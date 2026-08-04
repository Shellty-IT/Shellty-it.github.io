// src/components/sectionTitle/SectionTitle.js
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./SectionTitle.css";

/**
 * Nagłówek sekcji w stylu HUD.
 *
 * Układ (3 wiersze, wyśrodkowane):
 *   ──── 02 ────          numer sekcji spójny z numeracją w navbarze
 *   ⟦  BIO  ⟧             tytuł w gradiencie + ramki HUD
 *   KIM JESTEM I JAK PRACUJĘ   krótki podtytuł (monospace)
 *
 * Wejście animowane jest po wejściu w viewport (IntersectionObserver, jednorazowo).
 * Stan początkowy "ukryty" włączany jest dopiero z JS (klasa --armed), więc bez
 * skryptów / przy prerenderze nagłówek jest normalnie widoczny.
 *
 * @param {string} num      - dwucyfrowy numer sekcji, np. "02"
 * @param {string} title    - tekst tytułu (np. "Bio")
 * @param {string} [sub]    - krótki podtytuł pod tytułem
 * @param {boolean} [hovered] - stan hovera dziedziczony z obszaru nagłówka sekcji
 * @param {"h1"|"h2"} [as]  - poziom nagłówka (domyślnie h1)
 * @param {string} [className] - dodatkowa klasa na wrapperze
 */
const SectionTitle = ({
    num,
    title,
    sub,
    hovered = false,
    as: Tag = "h1",
    className = "",
}) => {
    const rootRef = useRef(null);
    const sawObserver = useRef(false);
    const [armed, setArmed] = useState(false);
    const [inView, setInView] = useState(false);

    // Uzbrojenie stanu początkowego przed pierwszym malowaniem (bez mignięcia).
    useLayoutEffect(() => {
        if (typeof IntersectionObserver === "undefined") return;
        setArmed(true);
    }, []);

    useEffect(() => {
        if (!armed) return;

        const el = rootRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                sawObserver.current = true;
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.35, rootMargin: "0px 0px -40px 0px" }
        );

        observer.observe(el);

        // Bezpiecznik: działający IntersectionObserver zawsze zgłasza stan
        // początkowy. Brak zgłoszenia oznacza, że jest niesprawny – wtedy
        // rozbrajamy animację, żeby tytuł nie został ukryty na stałe.
        const guard = setTimeout(() => {
            if (!sawObserver.current) setArmed(false);
        }, 1200);

        return () => {
            clearTimeout(guard);
            observer.disconnect();
        };
    }, [armed]);

    const classes = [
        "sec-head",
        armed ? "sec-head--armed" : "",
        inView ? "sec-head--in" : "",
        hovered ? "sec-head--hovered" : "",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={classes} ref={rootRef}>

            <span className="sec-head__meta" aria-hidden="true">
                <span className="sec-head__tick" />
                <span className="sec-head__num">{num}</span>
                <span className="sec-head__tick" />
            </span>

            <Tag className="sec-head__title">
                <span
                    className="sec-head__frame sec-head__frame--l"
                    aria-hidden="true"
                />
                <span className="sec-head__text">{title}</span>
                <span
                    className="sec-head__frame sec-head__frame--r"
                    aria-hidden="true"
                />
            </Tag>

            {sub && <p className="sec-head__sub">{sub}</p>}

        </div>
    );
};

export default SectionTitle;
