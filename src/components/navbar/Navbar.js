// src/components/navbar/Navbar.js
import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Navbar.css';
import GlowIcon from '../glowIcon/GlowIcon';

import homeIcon from '../../assets/icons/home/home.webp';
import homeGlow from '../../assets/icons/home/home_glow.webp';

const Navbar = () => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [logoHovered, setLogoHovered] = useState(false);

    const navItems = useMemo(() => ([
        { to: '/',           labelKey: 'nav.home',       num: '01', end: true  },
        { to: '/about',      labelKey: 'nav.about',      num: '02', end: false },
        { to: '/experience', labelKey: 'nav.experience', num: '03', end: false },
        { to: '/skills',     labelKey: 'nav.skills',     num: '04', end: false },
        { to: '/portfolio',  labelKey: 'nav.portfolio',  num: '05', end: false },
        { to: '/contact',    labelKey: 'nav.contact',    num: '06', end: false },
    ]), []);

    const handleLangChange = (newLang) => {
        if (i18n.language === newLang) return;

        if (i18n.hasResourceBundle(newLang, 'translation')) {
            void i18n.changeLanguage(newLang);
            return;
        }

        import(`../../locales/${newLang}/translation.json`)
            .then((mod) => {
                i18n.addResourceBundle(
                    newLang,
                    'translation',
                    mod.default ?? mod,
                    true,
                    true
                );
                void i18n.changeLanguage(newLang);
            })
            .catch((error) => {
                console.error('Nie udało się załadować tłumaczeń:', error);
            });
    };

    const toggleMenu = () => setIsMenuOpen((prev) => !prev);
    const closeMenu  = useCallback(() => setIsMenuOpen(false), []);

    useEffect(() => {
        closeMenu();
    }, [location.pathname, closeMenu]);

    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMenuOpen]);

    return (
        <>
            <nav className="nav">

                {/* Logo – lewa krawędź */}
                <NavLink
                    to="/"
                    className="nav__logo"
                    aria-label={t('logo.ariaLabel')}
                    onMouseEnter={() => setLogoHovered(true)}
                    onMouseLeave={() => setLogoHovered(false)}
                    onClick={closeMenu}
                >
                    <GlowIcon
                        src={homeIcon}
                        srcGlow={homeGlow}
                        alt=""
                        className={`logo-glow-icon${logoHovered ? ' hovered' : ''}`}
                    />
                    <span className="logo-text">
                        <span className="logo-text-shell">Shell</span>
                        <span className="logo-text-ty">ty</span>
                    </span>
                </NavLink>

                {/* Rail – środek */}
                <div
                    className={`nav__rail${isMenuOpen ? ' open' : ''}`}
                    role="navigation"
                    aria-label="Nawigacja główna"
                >
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `nav__link${isActive ? ' is-active' : ''}`
                            }
                            end={item.end}
                            onClick={closeMenu}
                        >
                            <span className="num">{item.num}</span>
                            {t(item.labelKey)}
                        </NavLink>
                    ))}

                    {/* Language switcher w szufladzie (tylko mobile) */}
                    <div
                        className="nav__lang--drawer"
                        data-lang={i18n.language}
                        role="group"
                        aria-label="Wybór języka"
                    >
                        <button
                            type="button"
                            className={i18n.language === 'pl' ? 'is-active' : ''}
                            onClick={() => handleLangChange('pl')}
                            aria-pressed={i18n.language === 'pl'}
                        >
                            PL
                        </button>
                        <button
                            type="button"
                            className={i18n.language === 'en' ? 'is-active' : ''}
                            onClick={() => handleLangChange('en')}
                            aria-pressed={i18n.language === 'en'}
                        >
                            EN
                        </button>
                    </div>
                </div>

                {/* Language switcher – prawa krawędź */}
                <div
                    className="nav__lang"
                    data-lang={i18n.language}
                    role="group"
                    aria-label="Wybór języka"
                >
                    <button
                        type="button"
                        className={i18n.language === 'pl' ? 'is-active' : ''}
                        onClick={() => handleLangChange('pl')}
                        aria-pressed={i18n.language === 'pl'}
                    >
                        PL
                    </button>
                    <button
                        type="button"
                        className={i18n.language === 'en' ? 'is-active' : ''}
                        onClick={() => handleLangChange('en')}
                        aria-pressed={i18n.language === 'en'}
                    >
                        EN
                    </button>
                </div>

                {/* Hamburger */}
                <button
                    className={`nav__burger${isMenuOpen ? ' open' : ''}`}
                    onClick={toggleMenu}
                    aria-label={isMenuOpen ? 'Zamknij menu' : 'Otwórz menu'}
                    aria-expanded={isMenuOpen}
                >
                    <span />
                    <span />
                    <span />
                </button>

            </nav>

            {/* Overlay (mobile) */}
            <div
                className={`menu-overlay${isMenuOpen ? ' open' : ''}`}
                aria-hidden="true"
                onClick={closeMenu}
            />
        </>
    );
};

export default Navbar;