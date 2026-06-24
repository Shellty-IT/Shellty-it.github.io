// src/components/services/Services.js
import React, { useState } from 'react';
import { useIconPhase } from '../../hooks/useIconPhase';
import { HashLink } from 'react-router-hash-link';
import { useTranslation } from 'react-i18next';
import {
    FaWindowMaximize,
    FaLayerGroup,
    FaScrewdriverWrench,
    FaHeadset,
    FaUserGroup,
    FaPaperPlane,
} from 'react-icons/fa6';
import './Services.css';

import servicesIcon from '../../assets/icons/services/services.webp';
import servicesRotating from '../../assets/icons/services/services_rotating.webp';
import servicesCenter from '../../assets/icons/services/services_center.webp';

// Punkty świetlne ("gwiazdki"), które poprzedzają pojawienie się grafiki
const NODE_POINTS = [
    { id: 0, x: '22%', y: '22%' },
    { id: 1, x: '50%', y: '12%' },
    { id: 2, x: '78%', y: '22%' },
    { id: 3, x: '12%', y: '50%' },
    { id: 4, x: '50%', y: '50%' },
    { id: 5, x: '88%', y: '50%' },
    { id: 6, x: '22%', y: '78%' },
    { id: 7, x: '50%', y: '88%' },
    { id: 8, x: '78%', y: '78%' },
];

const Services = () => {
    const { t } = useTranslation();
    const [titleHovered, setTitleHovered] = useState(false);
    const { iconRef, iconPhase } = useIconPhase('svc-icon-wrap--pulse');

    const cards = [
        {
            icon: <FaWindowMaximize />,
            num: '01',
            kicker: t('services.card1.kicker'),
            title: t('services.card1.title'),
            desc: t('services.card1.desc'),
            forWhom: t('services.card1.forWhom'),
        },
        {
            icon: <FaLayerGroup />,
            num: '02',
            kicker: t('services.card2.kicker'),
            title: t('services.card2.title'),
            desc: t('services.card2.desc'),
            forWhom: t('services.card2.forWhom'),
        },
        {
            icon: <FaScrewdriverWrench />,
            num: '03',
            kicker: t('services.card3.kicker'),
            title: t('services.card3.title'),
            desc: t('services.card3.desc'),
            forWhom: t('services.card3.forWhom'),
        },
        {
            icon: <FaHeadset />,
            num: '04',
            kicker: t('services.card4.kicker'),
            title: t('services.card4.title'),
            desc: t('services.card4.desc'),
            forWhom: t('services.card4.forWhom'),
        },
    ];

    const steps = [
        { n: '1', title: t('services.step1.title'), desc: t('services.step1.desc') },
        { n: '2', title: t('services.step2.title'), desc: t('services.step2.desc') },
        { n: '3', title: t('services.step3.title'), desc: t('services.step3.desc') },
        { n: '4', title: t('services.step4.title'), desc: t('services.step4.desc') },
    ];

    const whys = [
        {
            icon: <FaLayerGroup />,
            title: t('services.why1.title'),
            desc: t('services.why1.desc'),
        },
        {
            icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" fill="currentColor" style={{ width: '1em', height: '1em' }}><path d="M208 352c114.9 0 208-78.8 208-176S322.9 0 208 0S0 78.8 0 176c0 38.6 14.7 74.3 39.6 103.4c-3.5 9.4-8.7 17.7-14.2 24.7c-4.8 6.2-9.7 11-13.3 14.3c-1.8 1.6-3.3 2.9-4.3 3.7c-.5 .4-.8 .7-1 .8l-.2 .2 0 0 0 0C1 327.2-1.4 334.4 .8 340.9S9.1 352 16 352c21.8 0 43.8-5.6 62.1-12.5c9.2-3.5 17.8-7.4 25.2-11.4C134.1 343.3 169.8 352 208 352zM448 176c0 112.3-99.1 196.9-216.5 207C255.8 457.4 336.4 512 432 512c38.2 0 73.9-8.7 104.7-23.9c7.5 4 16 7.9 25.2 11.4c18.3 6.9 40.3 12.5 62.1 12.5c6.9 0 13.1-4.5 15.2-11.1c2.1-6.6-.2-13.8-5.8-17.9l0 0 0 0-.2-.2c-.2-.2-.5-.4-1-.8c-1-.8-2.5-2-4.3-3.7c-3.6-3.3-8.5-8.1-13.3-14.3c-5.5-7-10.7-15.4-14.2-24.7c24.9-29 39.6-64.7 39.6-103.4c0-92.8-84.9-168.9-192.6-175.5c.4 5.1 .6 10.3 .6 15.5z"/></svg>,
            title: t('services.why2.title'),
            desc: t('services.why2.desc'),
        },
        {
            icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" style={{ width: '1em', height: '1em' }}><path d="M0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm188.3-108.9c-7.6 3.5-13.3 10.6-14.8 19.1l-24 136c-2.3 12.9 4.8 25.7 17 30.7l128 52c7.7 3.1 16.4 2.1 23.2-2.7s10.8-12.8 10.5-21.2l-4-112c-.2-5.8-2.5-11.3-6.5-15.5L224.7 142.6c-6.2-6.5-15.3-9.1-24.4-5.5z"/></svg>,
            title: t('services.why3.title'),
            desc: t('services.why3.desc'),
        },
        {
            icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" style={{ width: '1em', height: '1em' }}><path d="M0 416c0 17.7 14.3 32 32 32l54.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 448c17.7 0 32-14.3 32-32s-14.3-32-32-32l-246.7 0c-12.3-28.3-40.5-48-73.3-48s-61 19.7-73.3 48L32 384c-17.7 0-32 14.3-32 32zm128 0a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zM320 256a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm32-80c-32.8 0-61 19.7-73.3 48L32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l246.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48l54.7 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-54.7 0c-12.3-28.3-40.5-48-73.3-48zM192 128a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm73.3-64C253 35.7 224.8 16 192 16s-61 19.7-73.3 48L32 64C14.3 64 0 78.3 0 96s14.3 32 32 32l86.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 128c17.7 0 32-14.3 32-32s-14.3-32-32-32L265.3 64z"/></svg>,
            title: t('services.why4.title'),
            desc: t('services.why4.desc'),
        },
    ];

    return (
        <section id="services" className="svc">
            <div className="svc__container">

                {/* ─── Header ─── */}
                <header className="svc__header">
                    <div
                        className="svc__header-hover-area"
                        onMouseEnter={() => setTitleHovered(true)}
                        onMouseLeave={() => setTitleHovered(false)}
                    >
                        <div
                            ref={iconRef}
                            className={`svc-icon-wrap svc-icon-wrap--${iconPhase}`}
                            aria-hidden="true"
                        >
                            <div className="svc-icon-wrap__nodes" aria-hidden="true">
                                {NODE_POINTS.map((n) => (
                                    <span
                                        key={n.id}
                                        className="svc-icon-wrap__node"
                                        style={{ left: n.x, top: n.y }}
                                    />
                                ))}
                            </div>
                            <img
                                src={servicesIcon}
                                alt=""
                                className="svc-icon-wrap__base"
                                draggable="false"
                                width="240"
                                height="240"
                            />
                            <img
                                src={servicesRotating}
                                alt=""
                                className="svc-icon-wrap__rotating"
                                draggable="false"
                                width="240"
                                height="240"
                            />
                            <img
                                src={servicesCenter}
                                alt=""
                                className="svc-icon-wrap__center"
                                draggable="false"
                                width="240"
                                height="240"
                            />
                        </div>
                        <h2 className={`svc__title${titleHovered ? ' hovered' : ''}`}>
                            {t('services.title')}
                        </h2>
                    </div>
                </header>

                {/* ─── Intro ─── */}
                <p className="svc-intro" dangerouslySetInnerHTML={{ __html: t('services.intro') }} />

                {/* ─── Karty usług ─── */}
                <div className="svc-grid">
                    {cards.map((card) => (
                        <article key={card.num} className="svc-card">
                            <span className="corner tl" />
                            <span className="corner br" />
                            <div className="svc-card__head">
                                <span className="svc-card__icon">{card.icon}</span>
                                <span className="svc-card__num">{card.num}</span>
                            </div>
                            <div className="svc-card__kicker">{card.kicker}</div>
                            <h3 className="svc-card__title">{card.title}</h3>
                            <p className="svc-card__desc">{card.desc}</p>
                            <div className="svc-card__for">
                                <FaUserGroup />
                                <span><b>{t('services.forWhomLabel')}</b> {card.forWhom}</span>
                            </div>
                        </article>
                    ))}
                </div>

                {/* ─── Jak pracuję ─── */}
                <div className="svc-block-head">
                    <span className="num">01 /</span>
                    <h3>{t('services.howTitle')}</h3>
                    <span className="rule" />
                </div>
                <div className="svc-steps">
                    {steps.map((step) => (
                        <div key={step.n} className="svc-step">
                            <div className="svc-step__n">{step.n}</div>
                            <h4 className="svc-step__title">{step.title}</h4>
                            <p className="svc-step__desc">{step.desc}</p>
                        </div>
                    ))}
                </div>

                {/* ─── Dlaczego ja ─── */}
                <div className="svc-block-head">
                    <span className="num">02 /</span>
                    <h3>{t('services.whyTitle')}</h3>
                    <span className="rule" />
                </div>
                <div className="svc-why-grid">
                    {whys.map((why, i) => (
                        <div key={i} className="svc-why">
                            <span className="ic">{why.icon}</span>
                            <div>
                                <h4>{why.title}</h4>
                                <p>{why.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ─── CTA ─── */}
                <div className="svc-cta">
                    <div className="svc-cta__text">
                        <h3>{t('services.ctaTitle')}</h3>
                        <p>{t('services.ctaSubtitle')} <span className="accent">{t('services.ctaAccent')}</span></p>
                    </div>
                    <HashLink smooth to="/contact/#contact" className="btn btn--primary">
                        <FaPaperPlane />
                        {t('services.ctaBtn')}
                    </HashLink>
                </div>

            </div>
        </section>
    );
};

export default Services;
