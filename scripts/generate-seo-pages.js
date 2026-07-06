const fs = require("fs");
const path = require("path");
const metadata = require("../src/seo/metadata.json");

const buildDir = path.resolve(__dirname, "..", "build");
const templatePath = path.join(buildDir, "index.html");

const escapeHtml = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const today = new Date().toISOString().slice(0, 10);

const replaceRequired = (html, pattern, replacement, label) => {
    if (!pattern.test(html)) {
        throw new Error(`Nie znaleziono elementu SEO: ${label}`);
    }
    return html.replace(pattern, replacement);
};

const replaceMeta = (html, attribute, key, value) => {
    const tagPattern = new RegExp(
        `<meta\\b[^>]*\\b${attribute}="${escapeRegExp(key)}"[^>]*>`,
        "i"
    );
    const match = html.match(tagPattern);

    if (!match) {
        throw new Error(`Nie znaleziono meta ${attribute}="${key}"`);
    }

    const updatedTag = match[0].replace(
        /content="[^"]*"/i,
        `content="${escapeHtml(value)}"`
    );

    return html.replace(tagPattern, updatedTag);
};

const stripBrand = (title) => title
    .replace(/\s*\|\s*Shellty\s*$/i, "")
    .trim();

const renderFallbackContent = (routePath, route) => {
    const content = route.pl;
    const links = Object.entries(metadata.routes)
        .map(([pathName, routeItem]) => {
            const label = stripBrand(routeItem.pl.socialTitle || routeItem.pl.title);
            return `<li><a href="${escapeHtml(pathName)}">${escapeHtml(label)}</a></li>`;
        })
        .join("");

    return [
        '<main class="seo-fallback" aria-label="Treść strony">',
        `  <h1>${escapeHtml(stripBrand(content.title))}</h1>`,
        `  <p>${escapeHtml(content.description)}</p>`,
        '  <nav aria-label="Najważniejsze podstrony">',
        `    <ul>${links}</ul>`,
        "  </nav>",
        "</main>"
    ].join("");
};

const renderPage = (template, routePath, route) => {
    const content = route.pl;
    const canonical = `${metadata.siteUrl}${routePath}`;
    let html = template;

    html = replaceRequired(
        html,
        /<html\b[^>]*\blang="[^"]*"[^>]*>/i,
        (tag) => tag.replace(/lang="[^"]*"/i, 'lang="pl"'),
        "html[lang]"
    );
    html = replaceRequired(
        html,
        /<title>.*?<\/title>/i,
        `<title>${escapeHtml(content.title)}</title>`,
        "title"
    );
    html = replaceRequired(
        html,
        /<link\b[^>]*\brel="canonical"[^>]*>/i,
        `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
        "canonical"
    );
    html = replaceMeta(html, "name", "description", content.description);
    html = replaceMeta(html, "name", "robots", "index, follow");
    html = replaceMeta(html, "property", "og:url", canonical);
    html = replaceMeta(html, "property", "og:title", content.socialTitle);
    html = replaceMeta(html, "property", "og:description", content.socialDescription);
    html = replaceMeta(html, "property", "og:locale", "pl_PL");
    html = replaceMeta(html, "name", "twitter:title", content.socialTitle);
    html = replaceMeta(html, "name", "twitter:description", content.socialDescription);
    html = replaceRequired(
        html,
        /<div\s+id="root"><\/div>/i,
        `<div id="root">${renderFallbackContent(routePath, route)}</div>`,
        "root fallback"
    );

    if ((html.match(/<title>/gi) || []).length !== 1) {
        throw new Error(`Nieprawidłowa liczba title dla ${routePath}`);
    }
    if ((html.match(/<meta\s+name="description"/gi) || []).length !== 1) {
        throw new Error(`Nieprawidłowa liczba description dla ${routePath}`);
    }

    return html;
};

const renderSitemapXml = () => {
    const urls = Object.keys(metadata.routes)
        .map((routePath) => [
            "  <url>",
            `    <loc>${escapeHtml(`${metadata.siteUrl}${routePath}`)}</loc>`,
            `    <lastmod>${today}</lastmod>`,
            "  </url>"
        ].join("\n"))
        .join("\n");

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        urls,
        "</urlset>",
        ""
    ].join("\n");
};

const renderSitemapTxt = () => `${Object.keys(metadata.routes)
    .map((routePath) => `${metadata.siteUrl}${routePath}`)
    .join("\n")}\n`;

if (!fs.existsSync(templatePath)) {
    throw new Error("Najpierw uruchom build Reacta.");
}

const template = fs.readFileSync(templatePath, "utf8");

for (const [routePath, route] of Object.entries(metadata.routes)) {
    const outputPath = path.join(buildDir, route.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, renderPage(template, routePath, route), "utf8");
}

fs.writeFileSync(path.join(buildDir, "sitemap.xml"), renderSitemapXml(), "utf8");
fs.writeFileSync(path.join(buildDir, "sitemap.txt"), renderSitemapTxt(), "utf8");

console.log(`Wygenerowano ${Object.keys(metadata.routes).length} stron SEO oraz mapy witryny.`);
