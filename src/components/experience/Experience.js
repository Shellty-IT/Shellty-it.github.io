import React, { useState } from "react";
import "./Experience.css";
import {
    FaBuilding,
    FaCalendarAlt,
    FaMapMarkerAlt,
    FaServer,
    FaNetworkWired,
    FaDatabase,
    FaPrint,
    FaCode,
    FaCogs,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useIconPhase } from "../../hooks/useIconPhase";

import experienceIcon from "../../assets/icons/experience/experience.webp";
import experienceGlow from "../../assets/icons/experience/experience_glow.webp";

const TAG_ICONS = {
    servers: FaServer,
    net: FaNetworkWired,
    db: FaDatabase,
    tools: FaCode,
    print: FaPrint,
    mon: FaCogs,
    backup: FaDatabase,
    win: FaServer,
    pos: FaCogs,
    cfg: FaNetworkWired,
};

const JOBS = [
    { key: "streetcom", bulletCount: 4, tags: ["servers", "net", "db", "tools"] },
    { key: "ata", bulletCount: 4, tags: ["print", "net", "mon"] },
    { key: "hisert", bulletCount: 4, tags: ["servers", "net", "backup"] },
    { key: "rzgw", bulletCount: 4, tags: ["net", "win"] },
    { key: "exorigo", bulletCount: 3, tags: ["pos", "cfg"] },
    { key: "wasko", bulletCount: 3, tags: [] },
    { key: "eot", bulletCount: 3, tags: [] },
];

const NODE_POINTS = [
    { id: 0, x: "20%", y: "20%" },
    { id: 1, x: "50%", y: "10%" },
    { id: 2, x: "80%", y: "20%" },
    { id: 3, x: "10%", y: "50%" },
    { id: 4, x: "50%", y: "50%" },
    { id: 5, x: "90%", y: "50%" },
    { id: 6, x: "20%", y: "80%" },
    { id: 7, x: "50%", y: "90%" },
    { id: 8, x: "80%", y: "80%" },
];

const Experience = () => {
    const { t } = useTranslation();
    const [titleHovered, setTitleHovered] = useState(false);
    const { iconRef, iconPhase } = useIconPhase('exp-icon--pulse');

    return (
        <section id="experience" className="exp">
            <div className="exp__container">
                <header className="exp__header">
                    <div
                        ref={iconRef}
                        className={`exp-icon exp-icon--${iconPhase}`}
                    >
                        <div className="exp-icon__nodes" aria-hidden="true">
                            {NODE_POINTS.map((n) => (
                                <span
                                    key={n.id}
                                    className="exp-icon__node"
                                    style={{ left: n.x, top: n.y }}
                                />
                            ))}
                        </div>
                        <img
                            src={experienceIcon}
                            alt=""
                            aria-hidden="true"
                            className="exp-icon__img exp-icon__img--base"
                            draggable="false"
                        />
                        <img
                            src={experienceGlow}
                            alt=""
                            aria-hidden="true"
                            className="exp-icon__img exp-icon__img--lit"
                            draggable="false"
                        />
                    </div>

                    <div
                        className="exp__header-hover-area"
                        onMouseEnter={() => setTitleHovered(true)}
                        onMouseLeave={() => setTitleHovered(false)}
                    >
                        <h2 className={`exp__title ${titleHovered ? "hovered" : ""}`}>
                            {t("experience.title")}
                        </h2>
                    </div>
                </header>

                <ol className="exp__timeline">
                    {JOBS.map(({ key, bulletCount, tags }) => (
                        <li key={key} className="exp__item">
                            <div className="exp__pin" aria-hidden="true" />
                            <div className="exp__card">
                                <div className="exp__top">
                                    <div className="exp__where">
                                        <FaBuilding /> {t(`experience.jobs.${key}.where`)}
                                    </div>
                                    <div className="exp__meta">
                                        <span className="exp__meta-item">
                                            <FaCalendarAlt /> {t(`experience.jobs.${key}.date`)}
                                        </span>
                                        <span className="exp__meta-item">
                                            <FaMapMarkerAlt /> {t(`experience.jobs.${key}.loc`)}
                                        </span>
                                    </div>
                                </div>

                                <ul className="exp__bullets">
                                    {Array.from({ length: bulletCount }, (_, i) => (
                                        <li key={i}>
                                            {t(`experience.jobs.${key}.bullets.${i}`)}
                                        </li>
                                    ))}
                                </ul>

                                {tags.length > 0 && (
                                    <div className="exp__tags">
                                        {tags.map((tag) => {
                                            const Icon = TAG_ICONS[tag];
                                            return (
                                                <span key={tag} className="tag">
                                                    <Icon /> {t(`experience.jobs.${key}.tags.${tag}`)}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
};

export default Experience;
