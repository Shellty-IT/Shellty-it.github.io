import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import metadata from "./metadata.json";

const normalizePath = (pathname) => {
    if (pathname === "/") return "/";
    return `/${pathname.split("/").filter(Boolean).join("/")}/`;
};

const setMeta = (attribute, key, content) => {
    const selector = `meta[${attribute}="${key}"]`;
    let element = document.head.querySelector(selector);

    if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
    }

    element.setAttribute("content", content);
};

const setCanonical = (href) => {
    let element = document.head.querySelector('link[rel="canonical"]');

    if (!element) {
        element = document.createElement("link");
        element.setAttribute("rel", "canonical");
        document.head.appendChild(element);
    }

    element.setAttribute("href", href);
};

export default function SeoManager() {
    const location = useLocation();
    const { i18n } = useTranslation();
    const language = i18n.resolvedLanguage?.startsWith("en") ? "en" : "pl";

    useEffect(() => {
        const path = normalizePath(location.pathname);
        const route = metadata.routes[path];

        document.documentElement.lang = language;

        if (!route) {
            setMeta("name", "robots", "noindex, follow");
            return;
        }

        const content = route[language];
        const canonical = `${metadata.siteUrl}${path}`;
        const locale = language === "en" ? "en_US" : "pl_PL";

        document.title = content.title;
        setCanonical(canonical);
        setMeta("name", "description", content.description);
        setMeta("name", "robots", "index, follow");
        setMeta("property", "og:url", canonical);
        setMeta("property", "og:title", content.socialTitle);
        setMeta("property", "og:description", content.socialDescription);
        setMeta("property", "og:locale", locale);
        setMeta("name", "twitter:title", content.socialTitle);
        setMeta("name", "twitter:description", content.socialDescription);
    }, [language, location.pathname]);

    return null;
}
