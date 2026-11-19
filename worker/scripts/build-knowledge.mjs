import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const output = join(root, 'worker', 'src', 'ai', 'knowledge.js');

function readTranslations(lang) {
    const text = readFileSync(join(root, 'src', 'locales', lang, 'translation.json'), 'utf8');
    return JSON.parse(text.replace(/^﻿/, ''));
}

function plain(text) {
    return String(text ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function firstSentences(text, count) {
    const sentences = plain(text).match(/[^.!?]+[.!?]+/g) ?? [plain(text)];
    return sentences.slice(0, count).join('').trim();
}

const pl = readTranslations('pl');
const { services } = pl;

const knowledge = {
    owner: 'Tomasz Skorupski (Shellty)',
    location: 'Pracuje zdalnie, z okolic Szczecina i Stargardu, dla klientów z całej Polski.',
    contact: { email: 'kontakt@shellty.pl', responseTime: plain(pl.contact.sub) },
    about: plain(pl.about.p1),
    services: ['card1', 'card2', 'card3', 'card4'].map((key) => ({
        name: plain(services[key].kicker),
        title: plain(services[key].title),
        description: firstSentences(services[key].desc, 3),
    })),
    process: ['step1', 'step2', 'step3', 'step4'].map((key) => `${plain(services[key].title)}: ${plain(services[key].desc)}`),
    whyMe: ['why1', 'why2', 'why4'].map((key) => `${plain(services[key].title)}: ${plain(services[key].desc)}`),
    reviews: services.reviews.items.map((review) => `${plain(review.text)} (${review.author}, ${review.source})`),
};

writeFileSync(output, `export const KNOWLEDGE = ${JSON.stringify(knowledge, null, 4)};\n`);
console.log(`Knowledge written to ${output}`);
