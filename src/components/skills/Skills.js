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
import SectionIcon from '../sectionIcon/SectionIcon';
import SectionTitle from "../sectionTitle/SectionTitle";

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
    { name: "Firebase",                Icon: SiFirebase },
    { name: "Angular",                 Icon: SiAngular },
];

// ─── Konfiguracja: Tier 3 – growing ──────────────────────────────────────────
const GROWING_SKILLS = [
    { name: "Ansible (IaC)",              Icon: SiAnsible },
    { name: "Chmura",                     Icon: FaCloud, suffixIcons: [FaAmazon, TbBrandAzure, SiGooglecloud] },
    { name: "CI/CD (GH Actions)",         Icon: SiGithubactions },
    { name: "Next.js",                    Icon: SiNextdotjs },
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

const SKILL_GROUPS = [
    { key: 'core', num: '01', skills: CORE_SKILLS, className: 'sk-grid--core', Card: CoreCard },
    { key: 'solid', num: '02', skills: SOLID_SKILLS, className: 'sk-grid--solid', Card: SolidCard },
    { key: 'growing', num: '03', skills: GROWING_SKILLS, className: 'sk-tag-cloud', Card: GrowingTag },
];

// ─── Główny komponent ─────────────────────────────────────────────────────────
const Skills = () => {
    const { t } = useTranslation();
    const [titleHovered, setTitleHovered] = useState(false);

    return (
        <section id="skills" className="skills">
            <div className="skills__container">

                {/* Header */}
                <header className="skills__header">
                    <SectionIcon
                        className="sk-icon-wrap"
                        nodes={ICON_NODES}
                        icon={skillsIcon}
                        glow={skillsGlow}
                    />

                    <div
                        className="skills__header-hover-area"
                        onMouseEnter={() => setTitleHovered(true)}
                        onMouseLeave={() => setTitleHovered(false)}
                    >
                        <SectionTitle
                            num="05"
                            title={t("skills.title")}
                            sub={t("skills.sub")}
                            hovered={titleHovered}
                        />
                    </div>
                </header>

                {SKILL_GROUPS.map(({ key, num, skills, className, Card }) => (
                    <section className="sk-group" key={key}>
                        <div className="sk-group__head">
                            <span className="sk-group__num">{`${num} /`}</span>
                            <h2 className="sk-group__title">{t(`skills.groups.${key}`)}</h2>
                            <span className="sk-group__rule" />
                            <span className="sk-group__count">
                                {String(skills.length).padStart(2, '0')}
                            </span>
                        </div>
                        <div className={className}>
                            {skills.map((skill) => <Card key={skill.name} {...skill} />)}
                        </div>
                    </section>
                ))}

            </div>
        </section>
    );
};

export default Skills;
