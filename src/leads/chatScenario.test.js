import pl from '../locales/pl/translation.json';
import en from '../locales/en/translation.json';
import { getProjects } from '../components/portfolio/projects';
import {
    CHAT_NODES,
    CHAT_START,
    OPEN_QUALIFIER,
    WRITE_TO_TOMEK,
    matchTopic,
    nodeReplies,
    pageKey,
    replyTarget,
} from './chatScenario';

const LOCALES = { pl, en };
const PROJECT_IDS = new Set(getProjects((key) => key, 'pl').map((project) => project.id));
const allReplies = [...new Set(Object.keys(CHAT_NODES).flatMap(nodeReplies))];

function reachableNodes() {
    const seen = new Set([CHAT_START]);
    const queue = [CHAT_START];
    while (queue.length > 0) {
        for (const reply of nodeReplies(queue.shift())) {
            const target = replyTarget(reply);
            if (target !== OPEN_QUALIFIER && !seen.has(target)) {
                seen.add(target);
                queue.push(target);
            }
        }
    }
    return seen;
}

describe('chat scenario', () => {
    it('starts with the four main topics and the option to write to Tomek', () => {
        expect(nodeReplies(CHAT_START)).toEqual(['website', 'app', 'it', 'portfolio', WRITE_TO_TOMEK]);
    });

    it('points every reply to an existing node or to the qualifier', () => {
        const broken = allReplies.filter((reply) => {
            const target = replyTarget(reply);
            return target !== OPEN_QUALIFIER && !CHAT_NODES[target];
        });
        expect(broken).toEqual([]);
    });

    it('lets every conversation reach the contact card', () => {
        const reachable = reachableNodes();
        expect(reachable.has('contact')).toBe(true);
        expect(reachable.has('itEmergency')).toBe(true);
        const deadEnds = [...reachable].filter((node) => !CHAT_NODES[node].contact && nodeReplies(node).length === 0);
        expect(deadEnds).toEqual([]);
    });

    it('always offers writing to Tomek until the contact card is shown', () => {
        const missing = Object.keys(CHAT_NODES).filter(
            (node) => !CHAT_NODES[node].contact
                && !['thanks', 'noted', 'noteFailed'].includes(node)
                && !nodeReplies(node).includes(WRITE_TO_TOMEK)
        );
        expect(missing).toEqual([]);
    });

    it('shows only existing portfolio projects', () => {
        const projects = Object.values(CHAT_NODES).flatMap((node) => node.projects ?? (node.project ? [node.project] : []));
        expect(projects.filter(({ id }) => !PROJECT_IDS.has(id))).toEqual([]);
        expect(projects.map(({ id }) => id)).not.toContain('mobiSalon');
    });

    it.each([
        ['Ile kosztuje strona?', 'pricing'],
        ['How much would it cost?', 'pricing'],
        ['Serwer nie działa, pilne!', 'itEmergency'],
        ['Potrzebuję integracji z KSeF', 'appInvoices'],
        ['Chcę asystenta AI na stronie', 'appAi'],
        ['Szukam CRM do ofert', 'appOffers'],
        ['Potrzebuję nowej strony dla firmy', 'website'],
        ['Chcę zautomatyzować arkusze Excel', 'app'],
        ['Mamy problem z siecią w biurze', 'it'],
        ['Potrzebuję wsparcia IT', 'it'],
        ['Is it possible to meet?', 'unknown'],
        ['Pokażesz jakieś realizacje?', 'portfolio'],
        ['Jak wygląda współpraca?', 'process'],
        ['Dzień dobry', 'unknown'],
    ])('understands "%s"', (text, node) => {
        expect(matchTopic(text)).toBe(node);
    });

    it('matches greetings to the current page', () => {
        expect(pageKey('/')).toBe('home');
        expect(pageKey('/services')).toBe('services');
        expect(pageKey('/portfolio')).toBe('portfolio');
        expect(pageKey('/about')).toBe('default');
    });
});

describe('chat translations', () => {
    it.each(Object.keys(LOCALES))('has every node, reply, greeting and teaser in %s', (lang) => {
        const { chat } = LOCALES[lang];
        for (const node of Object.keys(CHAT_NODES)) expect(chat.nodes[node]?.messages?.length).toBeGreaterThan(0);
        for (const reply of [...allReplies, OPEN_QUALIFIER]) expect(chat.replies[reply]).toBeTruthy();
        for (const key of ['home', 'services', 'portfolio', 'default']) {
            expect(chat.greetings[key]).toBeTruthy();
            expect(chat.teasers[key]).toBeTruthy();
        }
    });

    it.each(Object.keys(LOCALES))('never mentions a price or uses an em dash in %s', (lang) => {
        const text = JSON.stringify(LOCALES[lang].chat);
        expect(text).not.toMatch(/\d\s*(zł|pln|eur|usd)|[€$£]/i);
        expect(text).not.toContain('—');
    });
});
