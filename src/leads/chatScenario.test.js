import pl from '../locales/pl/translation.json';
import en from '../locales/en/translation.json';
import { CHAT_NODES, pageKey } from './chatScenario';

const LOCALES = { pl, en };

describe('chat scenario', () => {
    it('matches teasers to the current page', () => {
        expect(pageKey('/')).toBe('home');
        expect(pageKey('/services')).toBe('services');
        expect(pageKey('/portfolio')).toBe('portfolio');
        expect(pageKey('/about')).toBe('default');
    });
});

describe('chat translations', () => {
    it.each(Object.keys(LOCALES))('has every message and teaser in %s', (lang) => {
        const { chat } = LOCALES[lang];
        for (const node of CHAT_NODES) expect(chat.nodes[node]).toBeTruthy();
        for (const key of ['home', 'services', 'portfolio', 'default']) expect(chat.teasers[key]).toBeTruthy();
    });

    it.each(Object.keys(LOCALES))('never mentions a price or uses an em dash in %s', (lang) => {
        const text = JSON.stringify(LOCALES[lang].chat);
        expect(text).not.toMatch(/\d\s*(zł|pln|eur|usd)|[€$£]/i);
        expect(text).not.toContain('—');
    });
});
