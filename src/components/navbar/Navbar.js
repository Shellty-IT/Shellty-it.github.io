// src/components/navbar/navbar.js
import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Navbar.css';
import GlowIcon from '../glowIcon/GlowIcon';

import homeIcon from '../../assets/icons/home/home.webp';
import homeGlow from '../../assets/icons/home/home_glow.webp';

import aboutIcon from '../../assets/icons/about/about.webp';
import aboutGlow from '../../assets/icons/about/about_glow.webp';

import experienceIcon from '../../assets/icons/experience/experience.webp';
import experienceGlow from '../../assets/icons/experience/experience_glow.webp';

import skillsIcon from '../../assets/icons/skills/skills.webp';
import skillsGlow from '../../assets/icons/skills/skills_glow.webp';

import portfolioIcon from '../../assets/icons/portfolio/portfolio.webp';
import portfolioGlow from '../../assets/icons/portfolio/portfolio_glow.webp';

import contactIcon from '../../assets/icons/contact/contact.webp';
import contactGlow from '../../assets/icons/contact/contact_glow.webp';

const Navbar = () => {
    const { t, i18n } = useTranslation();
    const linksContainerRef = useRef(null);
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [logoHovered, setLogoHovered] = useState(false);

    const navItems = useMemo(() => ([
        { to: '/about', labelKey: 'nav.about', icon: aboutIcon, iconGlow: aboutGlow },
        { to: '/experience', labelKey: 'nav.experience', icon: experienceIcon, iconGlow: experienceGlow },
        { to: '/skills', labelKey: 'nav.skills', icon: skillsIcon, iconGlow: skillsGlow },
        { to: '/portfolio', labelKey: 'nav.portfolio', icon: portfolioIcon, iconGlow: portfolioGlow },
        { to: '/contact', labelKey: 'nav.contact', icon: contactIcon, iconGlow: contactGlow },
    ]), []);

    const setPillToElement = useCallback((el) => {
        const container = linksContainerRef.current;
        if (!container || !el) return;
        const containerRect = container.getBoundingClientRect();
        const { left, width } = el.getBoundingClientRect();
        container.style.setProperty('--pill-left', `${left - containerRect.left}px`);
        container.style.setProperty('--pill-width', `${width}px`);
        container.style.setProperty('--pill-opacity', '1');
    }, []);

    const setPillToActive = useCallback(() => {
        const container = linksContainerRef.current;
        if (!container) return;
        const active = container.querySelector('a.active');
        if (active) {
            setPillToElement(active);
            try {
                active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } catch (_) {}
        } else {
            container.style.setProperty('--pill-opacity', '0');
        }
    }, [setPillToElement]);

    const handleMouseEnter = (e) => {
        const link = e.currentTarget.querySelector('a');
        if (link) setPillToElement(link);
    };

    const handleMouseLeave = () => setPillToActive();

    /**
     * Zmiana języka z leniwym ładowaniem zasobów.
     * Jeśli paczka dla żądanego języka nie jest jeszcze w i18next,
     * dynamicznie importujemy JSON (webpack chunk) i dopiero potem
     * wywołujemy changeLanguage. Dzięki temu do main bundle trafia
     * tylko język wykryty przy starcie.
     */
    const handleLangChange = (newLang) => {
        if (i18n.language === newLang) return;

        if (i18n.hasResourceBundle(newLang, 'translation')) {
            void i18n.changeLanguage(newLang);
            return;
        }

        import(`../../locales/${newLang}/translation.json`).then((mod) => {
            i18n.addResourceBundle(
                newLang,
                'translation',
                mod.default ?? mod,
                /* deepMerge */ true,
                /* overwrite  */ true
            );
            void i18n.changeLanguage(newLang);
        });
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    useEffect(() => {
        closeMenu();
    }, [location.pathname]);

    useEffect(() => {
        setPillToActive();
    }, [location.pathname, setPillToActive]);

    useEffect(() => {
        const onResize = () => setPillToActive();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [setPillToActive]);

    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMenuOpen]);

    return (
        <>
            <header className="main-header">
                <div className="header-logo">
                    <NavLink
                        to="/"
                        className="logo-link"
                        aria-label={t('logo.ariaLabel')}
                        onMouseEnter={() => setLogoHovered(true)}
                        onMouseLeave={() => setLogoHovered(false)}
                    >
                        <GlowIcon
                            src={homeIcon}
                            srcGlow={homeGlow}
                            alt="Home"
                            size={64}
                            className={`logo-glow-icon ${logoHovered ? 'hovered' : ''}`}
                        />
                        <span className={`logo-text ${logoHovered ? 'hovered' : ''}`}>
                            <span className="logo-text-shell">Shell</span>
                            <span className="logo-text-ty">ty</span>
                        </span>
                    </NavLink>
                </div>

                <nav
                    className={`main-nav ${isMenuOpen ? 'open' : ''}`}
                    ref={linksContainerRef}
                    onMouseLeave={handleMouseLeave}
                >
                    <ul>
                        {navItems.map((item) => (
                            <li key={item.to} onMouseEnter={handleMouseEnter}>
                                <NavLink
                                    to={item.to}
                                    className={({ isActive }) => (isActive ? 'active' : '')}
                                    end={item.to === '/'}
                                    onClick={closeMenu}
                                >
                                    <div className="nav-icon-wrapper">
                                        <GlowIcon
                                            src={item.icon}
                                            srcGlow={item.iconGlow}
                                            alt=""
                                            size={item.to === '/contact' ? 46 : item.to === '/experience' ? 36 : item.to === '/about' ? 42 : 36}
                                            className={`nav-glow-icon ${item.to === '/contact' ? 'nav-contact-icon' : item.to === '/experience' ? 'nav-experience-icon' : item.to === '/skills' ? 'nav-skills-icon' : item.to === '/about' ? 'nav-about-icon' : ''}`}
                                        />
                                    </div>
                                    <span>{t(item.labelKey)}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="header-right">
                    <div className="header-lang-switcher" data-lang={i18n.language}>
                        <button
                            type="button"
                            className={i18n.language === 'pl' ? 'active' : ''}
                            onClick={() => handleLangChange('pl')}
                            aria-pressed={i18n.language === 'pl'}
                        >
                            PL
                        </button>
                        <button
                            type="button"
                            className={i18n.language === 'en' ? 'active' : ''}
                            onClick={() => handleLangChange('en')}
                            aria-pressed={i18n.language === 'en'}
                        >
                            EN
                        </button>
                    </div>

                    <button
                        className={`hamburger ${isMenuOpen ? 'open' : ''}`}
                        onClick={toggleMenu}
                        aria-label={isMenuOpen ? 'Zamknij menu' : 'Otwórz menu'}
                        aria-expanded={isMenuOpen}
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </header>

            <div
                className={`menu-overlay ${isMenuOpen ? 'open' : ''}`}
                onClick={closeMenu}
            />
        </>
    );
};

export default Navbar;
