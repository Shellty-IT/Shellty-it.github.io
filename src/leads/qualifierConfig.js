import {
    FaBolt,
    FaCalendarAlt,
    FaCode,
    FaExclamationTriangle,
    FaFileAlt,
    FaHandsHelping,
    FaLightbulb,
    FaNetworkWired,
    FaPlus,
    FaQuestion,
    FaSearch,
    FaServer,
    FaSyncAlt,
    FaTools,
    FaWordpress,
} from 'react-icons/fa';
import {
    AdviceIcon,
    NewWebsiteIcon,
    OperationsDashboardIcon,
    ProjectUpdateIcon,
    SystemPulseIcon,
} from './ServiceIcons';

export const FIRST_STEP = 'service';
export const CONTACT_STEP = 'contact';

const SERVICE_FOLLOW_UP = { website: 'hasSite', app: 'appStage', fixes: 'fixTarget', it: 'itNeed' };

export const QUESTION_STEPS = {
    service: {
        options: [
            { id: 'website', icon: NewWebsiteIcon },
            { id: 'app', icon: OperationsDashboardIcon },
            { id: 'fixes', icon: ProjectUpdateIcon },
            { id: 'it', icon: SystemPulseIcon },
            { id: 'unsure', icon: AdviceIcon },
            { id: 'emergency', icon: FaExclamationTriangle, urgent: true },
        ],
        next: (value) => (value === 'emergency' ? CONTACT_STEP : SERVICE_FOLLOW_UP[value] ?? 'timeline'),
    },
    hasSite: {
        options: [
            { id: 'no', icon: FaPlus },
            { id: 'yes_new', icon: FaSyncAlt },
            { id: 'yes_fix', icon: FaTools },
        ],
        next: () => 'timeline',
    },
    appStage: {
        options: [
            { id: 'idea', icon: FaLightbulb },
            { id: 'spec', icon: FaFileAlt },
            { id: 'existing', icon: FaCode },
        ],
        next: () => 'timeline',
    },
    fixTarget: {
        options: [
            { id: 'wordpress', icon: FaWordpress },
            { id: 'webapp', icon: FaCode },
            { id: 'unknown', icon: FaQuestion },
        ],
        next: () => 'timeline',
    },
    itNeed: {
        options: [
            { id: 'oneoff', icon: FaTools },
            { id: 'ongoing', icon: FaHandsHelping },
            { id: 'server', icon: FaServer },
            { id: 'network', icon: FaNetworkWired },
        ],
        next: () => 'timeline',
    },
    timeline: {
        options: [
            { id: 'asap', icon: FaBolt },
            { id: 'month', icon: FaCalendarAlt },
            { id: 'browsing', icon: FaSearch },
        ],
        next: () => CONTACT_STEP,
    },
};
