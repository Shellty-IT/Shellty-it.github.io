export const CHAT_START = 'start';

const PAGE_KEYS = { '/': 'home', '/services': 'services', '/portfolio': 'portfolio' };

export function pageKey(pathname) {
    return PAGE_KEYS[pathname] ?? 'default';
}
export const OPEN_QUALIFIER = 'qualifier';
export const WRITE_TO_TOMEK = 'writeToTomek';

const REPLY_TARGETS = {
    [WRITE_TO_TOMEK]: 'contact',
};

const FOLLOW_UP = ['qualifier', 'process', 'contact'];
const AFTER_LEAD_NODES = ['thanks', 'noted', 'noteFailed'];

export const CHAT_NODES = {
    start: { replies: ['website', 'app', 'it', 'portfolio'] },
    website: { service: 'website', replies: ['websiteNew', 'websiteRedo'] },
    websiteNew: {
        service: 'website',
        project: { id: 'tomiForno', reason: 'fallback' },
        replies: FOLLOW_UP,
    },
    websiteRedo: { service: 'fixes', replies: ['contact', 'qualifier'] },
    app: { service: 'app', replies: ['appOffers', 'appInvoices', 'appAi', 'appOther'] },
    appOffers: { service: 'app', project: { id: 'smartQuoteAI', reason: 'offers' }, replies: FOLLOW_UP },
    appInvoices: { service: 'app', project: { id: 'ksefMaster', reason: 'ksef' }, replies: FOLLOW_UP },
    appAi: { service: 'app', project: { id: 'tomiForno', reason: 'aiAgent' }, replies: FOLLOW_UP },
    appOther: { service: 'app', replies: ['contact', 'qualifier'] },
    it: { service: 'it', replies: ['itEmergency', 'itCare', 'itOneOff'] },
    itEmergency: { service: 'emergency', contact: 'emergency' },
    itCare: { service: 'it', replies: ['contact', 'process'] },
    itOneOff: { service: 'it', replies: ['contact', 'process'] },
    portfolio: {
        projects: [
            { id: 'tomiForno', reason: 'aiAgent' },
            { id: 'smartQuoteAI', reason: 'offers' },
            { id: 'budmaxTheme', reason: 'wordpress' },
        ],
        replies: ['qualifier', 'contact'],
    },
    process: { process: true, replies: ['contact', 'qualifier'] },
    pricing: { replies: ['contact', 'qualifier'] },
    contact: { contact: 'chat' },
    unknown: { contact: 'chat' },
    fromQualifier: { replies: ['contact', 'process'] },
    thanks: { replies: ['portfolio', 'qualifier'] },
    noted: { replies: ['portfolio', 'qualifier'] },
    noteFailed: { replies: ['portfolio', 'qualifier'] },
};

const TOPIC_PATTERNS = [
    ['itEmergency', /awari|nie dzia[łl]a|pad[łl]|pilne|outage|down\b|urgent|emergency/],
    ['pricing', /cen[aęy]|koszt|ile to|ile kosztuje|wycen|bud[żz]et|price|cost|quote for|how much/],
    ['appInvoices', /faktur|ksef|invoice/],
    ['appAi', /\bai\b|sztuczn|chatgpt|\bgpt|asystent|chatbot|artificial intelligence/],
    ['appOffers', /ofert|\bcrm\b|zam[óo]wie|quotes?\b|orders?\b/],
    ['website', /stron|witryn|sklep|landing|\bseo\b|google|website|web ?site|online shop|\bshop\b/],
    ['app', /aplikac|system|automatyz|excel|arkusz|\bapp\b|application|automat/],
    ['it', /serwer|sie[ćc]|komputer|backup|kopi[ae] zapas|poczt|network|server|computer|e-?mail/],
    ['portfolio', /realizac|portfolio|projekt|przyk[łl]ad|example|project|your work/],
    ['process', /wsp[óo][łl]prac|jak wygl[ąa]da|proces|etap|how .*work|process|cooperat/],
];

export function replyTarget(reply) {
    return REPLY_TARGETS[reply] ?? reply;
}

export function nodeReplies(nodeId) {
    const node = CHAT_NODES[nodeId];
    if (node.contact || AFTER_LEAD_NODES.includes(nodeId)) return node.replies ?? [];
    return [...node.replies, WRITE_TO_TOMEK];
}

export function matchTopic(text) {
    const normalized = text.toLowerCase();
    const match = TOPIC_PATTERNS.find(([, pattern]) => pattern.test(normalized));
    if (match) return match[0];
    return /\bIT\b/.test(text) ? 'it' : 'unknown';
}
