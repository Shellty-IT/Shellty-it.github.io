// src/components/skills/Skills.js
import React, { useMemo, useState } from "react";
import "./Skills.css";
import {
    FaWindows,
    FaLinux,
    FaNetworkWired,
    FaDatabase,
    FaTerminal,
    FaCloud,
    FaTools,
    FaComments,
    FaLightbulb,
    FaUsers,
    FaHtml5,
    FaCss3,
    FaAmazon
} from "react-icons/fa";
import {
    SiDocker,
    SiReact,
    SiJavascript,
    SiMysql,
    SiPostgresql,
    SiGit,
    SiGitlab,
    SiGithubactions,
    SiJira,
    SiFirebase,
    SiGooglecloud,
    SiPhp,
    SiNextdotjs,
    SiAngular,
    SiTailwindcss,
    SiBootstrap,
    SiNodedotjs,
    SiTypescript,
    SiPython,
    SiDotnet
} from "react-icons/si";
import { TbBrandAzure, TbApi } from "react-icons/tb";
import { FaMobileAlt } from "react-icons/fa";
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

const SkillItem = ({ name, level, Icon, twinIcon: Twin, suffixIcons, LEVELS }) => {
    const value = LEVELS[level] || 50;
    return (
        <div className="sk-item glass">
            <div className="sk-head">
                <div className="sk-icons">
                    <Icon className="sk-icon" />
                    {Twin && <Twin className="sk-icon sk-icon--twin" />}
                    {suffixIcons && suffixIcons.map((S, i) => <S key={i} className="sk-icon sk-icon--mini" />)}
                </div>
                <div className="sk-title">
                    {Array.isArray(name) ? (
                        <div className="sk-names sk-names--column">
                            {name.map((n, i) => (
                                <span key={i} className="sk-name-text">{n}</span>
                            ))}
                        </div>
                    ) : (
                        name
                    )}
                </div>
                <div className={`sk-level sk-level--${level}`}>{level}</div>
            </div>
            <div className="sk-bar">
                <div className="sk-bar__fill" style={{ width: `${value}%` }} />
            </div>
        </div>
    );
};

const Skills = () => {
    const { t, i18n } = useTranslation();
    const isEN = i18n.language?.startsWith("en");
    const [titleHovered, setTitleHovered] = useState(false);
    const { iconRef, iconPhase } = useIconPhase('sk-icon-wrap--pulse');

    const LEVELS = useMemo(() => (
        isEN
            ? { Advanced: 80, Intermediate: 65, Basics: 45 }
            : { Zaawansowany: 80, "Średniozaawansowany": 65, Podstawy: 45 }
    ), [isEN]);

    const GROUPS = useMemo(() => [
        {
            key: "systems",
            label: t("skills.groups.systems"),
            items: [
                { name: t("skills.items.win.name"), level: t("skills.items.win.level"), Icon: FaWindows, notes: t("skills.items.win.notes") },
                { name: t("skills.items.linux.name"), level: t("skills.items.linux.level"), Icon: FaLinux, notes: t("skills.items.linux.notes") },
                { name: t("skills.items.scripts.name"), level: t("skills.items.scripts.level"), Icon: FaTerminal },
                { id: "hardening", name: t("skills.items.hardening.name"), level: t("skills.items.hardening.level"), Icon: FaTools }
            ]
        },
        {
            key: "network",
            label: t("skills.groups.network"),
            items: [
                { name: t("skills.items.netProtocols.name"), level: t("skills.items.netProtocols.level"), Icon: FaNetworkWired },
                { id: "netDevices", name: t("skills.items.netDevices.name", { returnObjects: true }), level: t("skills.items.netDevices.level"), Icon: FaNetworkWired }
            ]
        },
        {
            key: "db",
            label: t("skills.groups.db"),
            items: [
                { name: t("skills.items.mysql.name"), level: t("skills.items.mysql.level"), Icon: SiMysql, notes: t("skills.items.mysql.notes") },
                { name: t("skills.items.postgres.name"), level: t("skills.items.postgres.level"), Icon: SiPostgresql },
                { name: t("skills.items.sql.name"), level: t("skills.items.sql.level"), Icon: FaDatabase }
            ]
        },
        {
            key: "devops",
            label: t("skills.groups.devops"),
            items: [
                { name: t("skills.items.cicd.name"), level: t("skills.items.cicd.level"), Icon: SiGithubactions },
                { name: t("skills.items.docker.name"), level: t("skills.items.docker.level"), Icon: SiDocker },
                {
                    name: t("skills.items.cloud.name"),
                    level: t("skills.items.cloud.level"),
                    Icon: FaCloud,
                    suffixIcons: [FaAmazon, TbBrandAzure, SiGooglecloud]
                }
            ]
        },
        {
            key: "frontend",
            label: t("skills.groups.frontend"),
            items: [
                { name: t("skills.items.react.name"), level: t("skills.items.react.level"), Icon: SiReact },
                { name: t("skills.items.nextjs.name"), level: t("skills.items.nextjs.level"), Icon: SiNextdotjs },
                { name: t("skills.items.angular.name"), level: t("skills.items.angular.level"), Icon: SiAngular },
                { name: t("skills.items.htmlcss.name"), level: t("skills.items.htmlcss.level"), Icon: FaHtml5, twinIcon: FaCss3 },
                { name: t("skills.items.tailwind.name"), level: t("skills.items.tailwind.level"), Icon: SiTailwindcss },
                { name: t("skills.items.bootstrap.name"), level: t("skills.items.bootstrap.level"), Icon: SiBootstrap },
                { name: t("skills.items.pwa.name"), level: t("skills.items.pwa.level"), Icon: FaMobileAlt },
                { name: t("skills.items.firebase.name"), level: t("skills.items.firebase.level"), Icon: SiFirebase },
                { name: t("skills.items.nodejs.name"), level: t("skills.items.nodejs.level"), Icon: SiNodedotjs },
                { name: t("skills.items.restapi.name"), level: t("skills.items.restapi.level"), Icon: TbApi },
                { name: t("skills.items.dotnet.name"), level: t("skills.items.dotnet.level"), Icon: SiDotnet }
            ]
        },
        {
            key: "languages",
            label: t("skills.groups.languages"),
            items: [
                { name: t("skills.items.js.name"), level: t("skills.items.js.level"), Icon: SiJavascript },
                { name: t("skills.items.ts.name"), level: t("skills.items.ts.level"), Icon: SiTypescript },
                { name: t("skills.items.python.name"), level: t("skills.items.python.level"), Icon: SiPython },
                { name: t("skills.items.csharp.name"), level: t("skills.items.csharp.level"), Icon: SiDotnet },
                { name: t("skills.items.php.name"), level: t("skills.items.php.level"), Icon: SiPhp }
            ]
        },
        {
            key: "tools",
            label: t("skills.groups.tools"),
            items: [
                { name: t("skills.items.jira.name"), level: t("skills.items.jira.level"), Icon: SiJira },
                { name: t("skills.items.gitlab.name"), level: t("skills.items.gitlab.level"), Icon: SiGitlab },
                { name: t("skills.items.github.name"), level: t("skills.items.github.level"), Icon: SiGit },
                { name: t("skills.items.security.name"), level: t("skills.items.security.level"), Icon: FaTools }
            ]
        },
        {
            key: "soft",
            label: t("skills.groups.soft"),
            items: [
                { name: t("skills.items.problemSolving.name"), level: t("skills.items.problemSolving.level"), Icon: FaLightbulb },
                { name: t("skills.items.communication.name"), level: t("skills.items.communication.level"), Icon: FaComments },
                { id: "teamwork", name: t("skills.items.teamwork.name"), level: t("skills.items.teamwork.level"), Icon: FaUsers }
            ]
        }
    ], [t]);

    const [active, setActive] = useState("all");
    const items = useMemo(() => {
        if (active === "all") return GROUPS;
        return GROUPS.filter((g) => g.key === active);
    }, [active, GROUPS]);

    return (
        <section id="skills" className="skills">
            <div className="skills__container">
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
                        />
                        <img
                            src={skillsGlow}
                            alt=""
                            aria-hidden="true"
                            className="sk-icon-wrap__img sk-icon-wrap__img--lit"
                            draggable="false"
                        />
                    </div>

                    <div
                        className="skills__header-hover-area"
                        onMouseEnter={() => setTitleHovered(true)}
                        onMouseLeave={() => setTitleHovered(false)}
                    >
                        <h2 className={`skills__title ${titleHovered ? 'hovered' : ''}`}>
                            {t("skills.title")}
                        </h2>
                    </div>

                    <dl className="skills__legend" aria-label={t("skills.legend.aria", { defaultValue: "Legenda poziomów umiejętności" })}>
                        <div className="legend-item">
                            <dt><b>{t("skills.legend.adv")}</b></dt>
                            <dd>~{LEVELS[isEN ? "Advanced" : "Zaawansowany"]}%</dd>
                        </div>
                        <div className="legend-item">
                            <dt><b>{t("skills.legend.mid")}</b></dt>
                            <dd>~{LEVELS[isEN ? "Intermediate" : "Średniozaawansowany"]}%</dd>
                        </div>
                        <div className="legend-item">
                            <dt><b>{t("skills.legend.basic")}</b></dt>
                            <dd>~{LEVELS[isEN ? "Basics" : "Podstawy"]}%</dd>
                        </div>
                    </dl>

                    <div className="skills__tabs">
                        <button
                            className={`tab ${active === "all" ? "is-active" : ""}`}
                            onClick={() => setActive("all")}
                        >
                            {t("skills.tabs.all")}
                        </button>
                        {GROUPS.map((g) => (
                            <button
                                key={g.key}
                                className={`tab ${active === g.key ? "is-active" : ""}`}
                                onClick={() => setActive(g.key)}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>
                </header>

                {items.map((group) => (
                    <section key={group.key} className="sk-group">
                        <h3 className="sk-group__title">{group.label}</h3>
                        <div className="sk-grid">
                            {group.items.map((s) => (
                                <SkillItem
                                    key={`${group.key}:${s.id ?? (Array.isArray(s.name) ? s.name.join('-') : s.name) ?? (s.Icon?.name || 'item')}`}
                                    {...s}
                                    LEVELS={LEVELS}
                                />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </section>
    );
};

export default Skills;
