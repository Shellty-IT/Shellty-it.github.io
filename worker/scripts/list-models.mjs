import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const workerDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function readDevVars() {
    const vars = {};
    for (const line of readFileSync(join(workerDir, '.dev.vars'), 'utf8').split(/\r?\n/)) {
        const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
        if (match) vars[match[1]] = match[2];
    }
    return vars;
}

const vars = readDevVars();
const providers = [
    { name: 'groq', url: 'https://api.groq.com/openai/v1/models', key: vars.GROQ_API_KEY },
    { name: 'gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai/models', key: vars.GEMINI_API_KEY },
];

for (const { name, url, key } of providers) {
    if (!key) {
        console.log(`${name}: no API key in .dev.vars`);
        continue;
    }
    const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    if (!response.ok) {
        console.log(`${name}: HTTP ${response.status}`);
        continue;
    }
    const { data } = await response.json();
    const ids = data.map((model) => model.id.replace(/^models\//, '')).sort();
    console.log(`${name} (${ids.length} models):\n  ${ids.join('\n  ')}`);
}
