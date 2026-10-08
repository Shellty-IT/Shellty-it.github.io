const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const metadata = require("../src/seo/metadata.json");

const buildDir = path.resolve(__dirname, "..", "build");
const xml = fs.readFileSync(path.join(buildDir, "sitemap.xml"), "utf8");
const xmlUrls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
const txtUrls = fs.readFileSync(path.join(buildDir, "sitemap.txt"), "utf8").trim().split(/\r?\n/);
const expected = Object.keys(metadata.routes).map((route) => metadata.siteUrl + route);
assert.deepEqual([...xmlUrls].sort(), [...expected].sort());
assert.deepEqual([...txtUrls].sort(), [...expected].sort());
assert.equal(new Set(xmlUrls).size, expected.length);

for (const [route, entry] of Object.entries(metadata.routes)) {
    const html = fs.readFileSync(path.join(buildDir, entry.output), "utf8");
    const canonical = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/gi)];
    assert.equal(canonical.length, 1, `${route}: canonical count`);
    assert.ok(canonical[0][0].includes(`href="${metadata.siteUrl}${route}"`));
    assert.match(html, /<meta\b[^>]*name="robots"[^>]*content="index, follow"/i);
    assert.equal((html.match(/<title>/gi) || []).length, 1);
    assert.ok(html.includes('id="root"'));
}

const notFound = fs.readFileSync(path.join(buildDir, "404.html"), "utf8");
assert.match(notFound, /name="robots"[^>]*content="noindex, follow"/i);
assert.doesNotMatch(notFound, /rel="canonical"|l\.replace\(|location\.replace\(/i);
assert.match(notFound, /<div id="root"><\/div>/i);
assert.match(notFound, /<script\b[^>]*src="\/static\/js\//i);
console.log(`SEO validation passed: ${expected.length} pages, matching sitemaps and non-redirecting 404.`);
