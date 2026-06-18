// src/components/skills/Skills.js
import React, { useState, memo } from "react";
import "./Skills.css";
import {
    FaWindows,
    FaLinux,
    FaNetworkWired,
    FaDatabase,
    FaCloud,
    FaHtml5,
    FaCss3,
    FaAmazon,
    FaMobileAlt,
} from "react-icons/fa";
import {
    SiDocker,
    SiReact,
    SiJavascript,
    SiMysql,
    SiPostgresql,
    SiGit,
    SiGithubactions,
    SiJira,
    SiFirebase,
    SiGooglecloud,
    SiPhp,
    SiNextdotjs,
    SiAngular,
    SiTailwindcss,
    SiNodedotjs,
    SiTypescript,
    SiPython,
    SiDotnet,
    SiAnsible,
} from "react-icons/si";
import { TbBrandAzure, TbApi } from "react-icons/tb";
import { MdSecurity } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { useIconPhase } from "../../hooks/useIconPhase";

import skillsIcon from "../../assets/icons/skills/skills.webp";
import skillsGlow from "../../assets/icons/skills/skills_glow.webp";

const ICON_NODES = [
    { id: 0, x: "20%", y: "12%" },
    { id: 1, x: "80%", y: "12%" },
    { id: 2, x: "10%", y: "42%" },
    { id: 3, x: "50%", y: "35%" },
    { id: 4, x: "90%", y: "42%" },
    { id: 5, x: "25%", y: "72%" },
    { id: 6, x: "50%", y: "88%" },
    { id: 7, x: "75%", y: "72%" },
    { id: 8, x: "50%", y: "55%" },
];

// ─── Konfiguracja: Tier 1 – core ─────────────────────────────────────────────
const CORE_SKILLS = [
    { name: "Administracja systemami i sieciami", Icon: FaNetworkWired,  meta: "Core · Infra" },
    { name: "Windows Server (AD, GPO)",           Icon: FaWindows,        meta: "Core · Sysadmin" },
    { name: "React",                              Icon: SiReact,          meta: "Core · Frontend" },
    { name: "JavaScript",                         Icon: SiJavascript,     meta: "Core · Language" },
    { name: "REST API",                           Icon: TbApi,            meta: "Core · Integration" },
    { name: "SQL",                                Icon: FaDatabase,       meta: "Core · Data" },
    { name: "HTML5 / CSS3",                       Icon: FaHtml5,          twinIcon: FaCss3, meta: "Core · Frontend" },
    { name: "Git / GitHub",                       Icon: SiGit,            meta: "Core · Workflow" },
    { name: "Jira",                               Icon: SiJira,           meta: "Core · Workflow" },
];

// ─── Konfiguracja: Tier 2 – solid ────────────────────────────────────────────
const SOLID_SKILLS = [
    { name: "C# / .NET",               Icon: SiDotnet },
    { name: "TypeScript",              Icon: SiTypescript },
    { name: "Docker",                  Icon: SiDocker },
    { name: "CI/CD (GH Actions)",      Icon: SiGithubactions },
    { name: "PostgreSQL",              Icon: SiPostgresql },
    { name: "MySQL",                   Icon: SiMysql },
    { name: "Linux / Bash",            Icon: FaLinux },
    { name: "PWA",                     Icon: FaMobileAlt },
    { name: "Bezpieczeństwo apl.",     Icon: MdSecurity },
    { name: "Node.js",                 Icon: SiNodedotjs },
    { name: "Next.js",                 Icon: SiNextdotjs },
    { name: "Python",                  Icon: SiPython },
    { name: "PHP",                     Icon: SiPhp },
];

// ─── Konfiguracja: Tier 3 – growing ──────────────────────────────────────────
const GROWING_SKILLS = [
    { name: "Ansible (IaC)",              Icon: SiAnsible },
    { name: "Chmura",                     Icon: FaCloud, suffixIcons: [FaAmazon, TbBrandAzure, SiGooglecloud] },
    { name: "Firebase",                   Icon: SiFirebase },
    { name: "Angular",                    Icon: SiAngular },
    { name: "Tailwind CSS",               Icon: SiTailwindcss },
];

// ─── Karta Tier 1 ─────────────────────────────────────────────────────────────
const CoreCard = memo(function CoreCard({ name, Icon, twinIcon: Twin, meta }) {
    return (
        <div className="sk-core">
            <span className="corner tl" aria-hidden="true" />
            <span className="corner br" aria-hidden="true" />

            <div className="sk-core__icon">
                <Icon />
                {Twin && <Twin className="sk-icon--twin" />}
            </div>

            <div className="sk-core__body">
                <div className="sk-core__name">{name}</div>
                {meta && <div className="sk-core__meta">{meta}</div>}
            </div>
        </div>
    );
});

// ─── Karta Tier 2 ─────────────────────────────────────────────────────────────
const SolidCard = memo(function SolidCard({ name, Icon }) {
    return (
        <div className="sk-solid">
            <span className="sk-solid__icon"><Icon /></span>
            <span className="sk-solid__name">{name}</span>
        </div>
    );
});

// ─── Tag Tier 3 ───────────────────────────────────────────────────────────────
const GrowingTag = memo(function GrowingTag({ name, Icon, suffixIcons }) {
    return (
        <span className="sk-tag">
            <Icon className="sk-tag__icon" />
            {suffixIcons && suffixIcons.map((S, i) => (
                <S key={i} className="sk-tag__icon sk-tag__icon--mini" />
            ))}
            <span className="sk-tag__name">{name}</span>
        </span>
    );
});

// ─── Główny komponent ─────────────────────────────────────────────────────────
const Skills = () => {
    const { t } = useTranslation();
    const [titleHovered, setTitleHovered] = useState(false);
    const { iconRef, iconPhase } = useIconPhase('sk-icon-wrap--pulse');

    return (
        <section id="skills" className="skills">
            <div className="skills__container">

                {/* Header */}
                <header className="skills__header">
                    <div
                        ref={iconRef}
                        className={`sk-icon-wrap sk-icon-wrap--${iconPhase}`}
                    >
                        <div className="sk-icon-wrap__nodes" aria-hidden="true">
                            {ICON_NODES.map((n) => (
                                <span
                                    key={n.id}
                                    className="sk-icon-wrap__node"
                                    style={{ left: n.x, top: n.y }}
                                />
                            ))}
                        </div>
                        <img
                            src={skillsIcon}
                            alt=""
                            aria-hidden="true"
                            className="sk-icon-wrap__img sk-icon-wrap__img--base"
                            draggable="false"
                            width="160"
                            height="160"
                        />
                        <img
                            src={skillsGlow}
                            alt=""
                            aria-hidden="true"
                            className="sk-icon-wrap__img sk-icon-wrap__img--lit"
                            draggable="false"
                            width="160"
                            height="160"
                        />
                    </div>

                    <div
                        className="skills__header-hover-area"
                        onMouseEnter={() => setTitleHovered(true)}
                        onMouseLeave={() => setTitleHovered(false)}
                    >
                        <h1 className={`skills__title ${titleHovered ? 'hovered' : ''}`}>
                            {t("skills.title")}
                        </h1>
                    </div>
                </header>

                {/* Tier 1 – Kluczowe kompetencje */}
                <section className="sk-group">
                    <div className="sk-group__head">
                        <span className="sk-group__num">01 /</span>
                        <h2 className="sk-group__title">{t("skills.groups.core")}</h2>
                        <span className="sk-group__rule" />
                        <span className="sk-group__count">
                            {String(CORE_SKILLS.length).padStart(2, '0')}
                        </span>
                    </div>
                    <div className="sk-grid--core">
                        {CORE_SKILLS.map((s) => (
                            <CoreCard key={s.name} {...s} />
                        ))}
                    </div>
                </section>

                {/* Tier 2 – Solidna znajomość */}
                <section className="sk-group">
                    <div className="sk-group__head">
                        <span className="sk-group__num">02 /</span>
                        <h2 className="sk-group__title">{t("skills.groups.solid")}</h2>
                        <span className="sk-group__rule" />
                        <span className="sk-group__count">
                            {String(SOLID_SKILLS.length).padStart(2, '0')}
                        </span>
                    </div>
                    <div className="sk-grid--solid">
                        {SOLID_SKILLS.map((s) => (
                            <SolidCard key={s.name} {...s} />
                        ))}
                    </div>
                </section>

                {/* Tier 3 – Aktywnie rozwijam */}
                <section className="sk-group">
                    <div className="sk-group__head">
                        <span className="sk-group__num">03 /</span>
                        <h2 className="sk-group__title">{t("skills.groups.growing")}</h2>
                        <span className="sk-group__rule" />
                        <span className="sk-group__count">
                            {String(GROWING_SKILLS.length).padStart(2, '0')}
                        </span>
                    </div>
                    <div className="sk-tag-cloud">
                        {GROWING_SKILLS.map((s) => (
                            <GrowingTag key={s.name} {...s} />
                        ))}
                    </div>
                </section>

            </div>
        </section>
    );
};

export default Skills;
