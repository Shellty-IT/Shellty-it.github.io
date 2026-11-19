import {
    FaBolt,
    FaBriefcase,
    FaBuilding,
    FaCalendarAlt,
    FaClock,
    FaCogs,
    FaCommentDots,
    FaDesktop,
    FaExclamationTriangle,
    FaHammer,
    FaLaptopCode,
    FaQuestion,
    FaSearch,
    FaServer,
    FaShoppingCart,
    FaSpa,
    FaUser,
    FaUsers,
    FaUtensils,
    FaWrench,
} from 'react-icons/fa';

export const FIRST_STEP = 'service';
export const ASK_QUESTION = 'ask';

const PATH_BY_SERVICE = { website: 'A', app: 'B', fixes: 'C', it: 'D' };
const PATH_BY_GOAL = { more_clients: 'A', save_time: 'B', broken: 'C', it_infra: 'D' };
const PATH_FIRST_STEP = { A: 'hasSite', B: 'appPain', C: 'fixTarget', D: 'itNeed' };

function startPath(answers) {
    return PATH_BY_SERVICE[answers.service] ?? PATH_BY_GOAL[answers.goal] ?? 'A';
}

export function resolvePath(answers) {
    return answers.hasSite === 'yes_fix' ? 'C' : startPath(answers);
}

export const QUESTION_STEPS = {
    service: {
        options: [
            { id: 'website', icon: FaDesktop },
            { id: 'app', icon: FaLaptopCode },
            { id: 'fixes', icon: FaWrench },
            { id: 'it', icon: FaServer },
            { id: 'unsure', icon: FaQuestion },
        ],
        urgentOption: { id: 'emergency', icon: FaExclamationTriangle },
        next: (value) => {
            if (value === 'emergency') return 'emergency';
            if (value === 'unsure') return 'goal';
            return 'industry';
        },
    },
    goal: {
        options: [
            { id: 'more_clients', icon: FaUsers },
            { id: 'save_time', icon: FaClock },
            { id: 'broken', icon: FaWrench },
            { id: 'it_infra', icon: FaServer },
            { id: 'talk', icon: FaCommentDots },
        ],
        next: (value) => (value === 'talk' ? ASK_QUESTION : 'industry'),
    },
    industry: {
        options: [
            { id: 'gastro', icon: FaUtensils },
            { id: 'local', icon: FaSpa },
            { id: 'construction', icon: FaHammer },
            { id: 'retail', icon: FaShoppingCart },
            { id: 'b2b', icon: FaBriefcase },
            { id: 'solo', icon: FaUser },
            { id: 'other', icon: FaBuilding },
        ],
        next: (_value, answers) => PATH_FIRST_STEP[startPath(answers)],
    },
    hasSite: {
        options: ['no', 'yes_new', 'yes_fix'],
        next: (value) => {
            if (value === 'yes_fix') return 'fixTarget';
            if (value === 'yes_new') return 'sitePains';
            return 'siteGoals';
        },
    },
    sitePains: {
        multiple: 2,
        withSiteUrl: true,
        options: ['no_clients', 'outdated', 'cant_edit', 'slow', 'bad_mobile'],
        next: () => 'timeline',
    },
    siteGoals: {
        multiple: 2,
        options: ['more_leads', 'google', 'self_edit', 'booking', 'ai', 'image'],
        next: () => 'timeline',
    },
    appPain: {
        options: ['excel', 'offers', 'invoices', 'automation', 'ai', 'mobile'],
        next: () => 'appStage',
    },
    appStage: {
        options: ['idea', 'spec', 'existing'],
        next: () => 'timeline',
    },
    fixTarget: {
        options: ['wordpress', 'other_cms', 'webapp', 'unknown'],
        next: () => 'fixTask',
    },
    fixTask: {
        options: ['broken', 'feature', 'speed', 'finish', 'script'],
        next: () => 'timeline',
    },
    itNeed: {
        options: ['oneoff', 'ongoing', 'server', 'network'],
        next: () => 'itPains',
    },
    itPains: {
        multiple: 2,
        options: ['outages', 'no_backup', 'no_admin', 'slow', 'security'],
        next: () => 'timeline',
    },
    timeline: {
        options: [
            { id: 'asap', icon: FaBolt },
            { id: 'month', icon: FaCalendarAlt },
            { id: 'quarter', icon: FaCogs },
            { id: 'browsing', icon: FaSearch },
        ],
        next: () => 'diagnosis',
    },
};

export const PATH_BENEFITS = {
    A: ['allInOne'],
    B: ['tailored'],
    C: ['diagnosisFirst'],
    D: [],
};

export const INDUSTRY_BENEFITS = {
    gastro: 'industryGastro',
    local: 'industryLocal',
    construction: 'industryConstruction',
    retail: 'industryRetail',
    b2b: 'industryB2b',
    solo: 'industrySolo',
};

export const ANSWER_BENEFITS = {
    'sitePains:no_clients': 'moreLeads',
    'sitePains:outdated': 'modern',
    'sitePains:cant_edit': 'selfEdit',
    'sitePains:slow': 'fast',
    'sitePains:bad_mobile': 'fast',
    'siteGoals:more_leads': 'moreLeads',
    'siteGoals:google': 'google',
    'siteGoals:self_edit': 'selfEdit',
    'siteGoals:booking': 'booking',
    'siteGoals:ai': 'aiSite',
    'siteGoals:image': 'modern',
    'appPain:excel': 'excel',
    'appPain:offers': 'offers',
    'appPain:invoices': 'invoices',
    'appPain:automation': 'automation',
    'appPain:ai': 'ai',
    'appPain:mobile': 'mobile',
    'fixTask:broken': 'repair',
    'fixTask:feature': 'feature',
    'fixTask:speed': 'speed',
    'fixTask:finish': 'finish',
    'fixTask:script': 'automation',
    'itNeed:oneoff': 'itOneOff',
    'itNeed:ongoing': 'itCare',
    'itNeed:server': 'itServer',
    'itNeed:network': 'itNetwork',
    'itPains:outages': 'itCare',
    'itPains:no_backup': 'itCare',
    'itPains:no_admin': 'itCare',
    'itPains:slow': 'itNetwork',
    'itPains:security': 'itSecurity',
};
