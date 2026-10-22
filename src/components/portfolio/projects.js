import mobisalonThumbnail from '../../assets/thumbnails/mobisalon.webp';
import ksefThumbnail from '../../assets/thumbnails/ksef_master.webp';
import ksefThumbnailAng from '../../assets/thumbnails/ksef_master_ang.webp';
import smartquoteThumbnail from '../../assets/thumbnails/smartquote.webp';
import postlioThumbnail from '../../assets/thumbnails/postlio.webp';
import postlioThumbnailAng from '../../assets/thumbnails/postlio_ang.webp';
import cookbookThumbnail from '../../assets/thumbnails/mobile_cook.webp';
import animalsThumbnail from '../../assets/thumbnails/one_page_animals.webp';
import shelltyBlogThumbnail from '../../assets/thumbnails/shellty_blog.webp';
import shelltyPulseThumbnail from '../../assets/thumbnails/shellty_pulse.webp';
import kanbanThumbnail from '../../assets/thumbnails/kanban.webp';
import kanbanThumbnailAng from '../../assets/thumbnails/kanban_ang.webp';
import shelltyCmsThumbnail from '../../assets/thumbnails/shellty_cms.webp';
import shelltyCmsThumbnailAng from '../../assets/thumbnails/shellty_cms_en.webp';
import budmaxThumbnail from '../../assets/thumbnails/wordpress_theme.webp';
import tomiFornoPl from '../../assets/thumbnails/tomi_forno_pl.webp';
import tomiFornoEn from '../../assets/thumbnails/tomi_forno_ang.webp';
import promptCoachThumbnail from '../../assets/thumbnails/coach.webp';
import promptCoachThumbnailAng from '../../assets/thumbnails/coach_ang.webp';
import lingoThumbnail from '../../assets/thumbnails/lingo.webp';
import lingoThumbnailAng from '../../assets/thumbnails/lingo_ang.webp';

const PROJECTS = [
    {
        id: "shelltyLingo",
        categories: ['mobile', 'ai'],
        image: lingoThumbnail,
        imageEn: lingoThumbnailAng,
        githubLink: 'https://github.com/Shellty-IT/Shellty-Lingo',
        status: true,
        hasHighlights: true,
        year: '2026',
    },
    {
        id: "tomiForno",
        categories: ['web', 'ai', 'wordpress'],
        featured: true,
        image: tomiFornoPl,
        imageEn: tomiFornoEn,
        demoLink: 'https://tomi-forno.shellty.pl',
        githubLink: null,
        videoLink: 'https://vimeo.com/1212534874',
        hasHighlights: true,
        year: '2026',
    },
    {
        id: "shelltyPromptCoach",
        categories: ['web', 'ai'],
        featured: true,
        image: promptCoachThumbnail,
        imageEn: promptCoachThumbnailAng,
        demoLink: 'https://prompt-coach.shellty.pl/',
        githubLink: null,
        videoLink: 'https://vimeo.com/1210656722?share=copy&fl=sv&fe=ci',
        hasHighlights: true,
        year: '2026',
    },
    {
        id: "smartQuoteAI",
        categories: ['web', 'ai', 'mobile'],
        featured: true,
        image: smartquoteThumbnail,
        demoLink: 'https://smart-quote.shellty.pl',
        githubLink: 'https://github.com/Shellty-IT/SmartQuote',
        videoLink: 'https://vimeo.com/1211656250',
        hasHighlights: true,
        year: '2026',
        hasCaseStudy: true,
        testAccount: {
            fields: [
                { labelKey: 'login', value: 'testowy@test.pl' },
                { labelKey: 'password', value: 'Testowe123!' },
            ],
        },
    },
    {
        id: "shelltyCMS",
        categories: ['web', 'wordpress'],
        image: shelltyCmsThumbnail,
        imageEn: shelltyCmsThumbnailAng,
        demoLink: 'https://cms.shellty.pl/',
        githubLink: null,
        videoLink: 'https://vimeo.com/1213704067',
        hasHighlights: true,
        year: '2026',
    },
    {
        id: "budmaxTheme",
        categories: ['wordpress'],
        image: budmaxThumbnail,
        demoLink: 'https://dev-customer-test.pantheonsite.io/',
        githubLink: null,
        videoLink: 'https://vimeo.com/1210625892?share=copy&fl=sv&fe=ci',
        hasHighlights: true,
        year: '2026',
    },
    {
        id: "shelltyKanban",
        categories: ['web'],
        image: kanbanThumbnail,
        imageEn: kanbanThumbnailAng,
        demoLink: 'https://kanban.shellty.pl/',
        githubLink: 'https://github.com/Shellty-IT/NerdsApp_KanbanApp',
        hasHighlights: true,
        year: '2026',
        hasCaseStudy: true,
        testAccount: {
            fields: [
                { labelKey: 'login', value: 'testowe@test.pl' },
                { labelKey: 'password', value: 'Testowe123!' },
            ],
        },
    },
    {
        id: "shelltyPulse",
        categories: ['tools'],
        image: shelltyPulseThumbnail,
        demoLink: 'https://pulse.shellty.pl',
        githubLink: 'https://github.com/Shellty-IT/Shellty-Pulse',
        hasHighlights: true,
        year: '2026',
        hasCaseStudy: true,
    },
    {
        id: "ksefMaster",
        categories: ['web', 'tools'],
        image: ksefThumbnail,
        imageEn: ksefThumbnailAng,
        demoLink: 'https://ksef-master.shellty.pl/',
        githubLink: 'https://github.com/Shellty-IT/KSeF_Master',
        hasHighlights: true,
        year: '2026',
        hasCaseStudy: true,
        testAccount: {
            noteKey: 'portfolio.testAccount.noteKsef',
            fields: [
                { labelKey: 'login', value: 'test@testowe.pl' },
                { labelKey: 'password', value: 'Testowe123!' },
            ],
        },
    },
    {
        id: "shelltyBlog",
        categories: ['web'],
        image: shelltyBlogThumbnail,
        demoLink: 'https://blog.shellty.pl',
        githubLink: 'https://github.com/Shellty-IT/Shellty_Blog',
        videoLink: 'https://vimeo.com/1175749805',
        hasHighlights: true,
        year: '2026',
        hasCaseStudy: true,
        testAccount: {
            fields: [
                { labelKey: 'login', value: 'admin@shellty.com' },
                { labelKey: 'password', value: 'Admin123!' },
            ],
        },
    },
    {
        id: "postlio",
        categories: ['web', 'ai', 'mobile'],
        image: postlioThumbnail,
        imageEn: postlioThumbnailAng,
        demoLink: 'https://postlio.shellty.pl/',
        githubLink: null,
        hasHighlights: true,
        year: '2026',
        hasCaseStudy: true,
        testAccount: {
            fields: [
                { labelKey: 'login', value: 'test@test.pl' },
                { labelKey: 'password', value: 'Testowe123!' },
            ],
        },
    },
    {
        id: "mobiSalon",
        categories: ['web'],
        image: mobisalonThumbnail,
        demoLink: 'https://mobisalon.netlify.app/',
        githubLink: 'https://github.com/Shellty-IT/mobi-grooming',
        hasHighlights: true,
        year: '2025',
        hasCaseStudy: true,
    },
    {
        id: "pwaCookbook",
        categories: ['mobile'],
        image: cookbookThumbnail,
        demoLink: 'https://mobilnaksiazkakucharska.netlify.app',
        githubLink: 'https://github.com/shellty-it/Mobilna-ksiazka-kucharska',
        year: '2021',
        hasCaseStudy: true,
        testAccount: {
            fields: [
                { labelKey: 'login', value: 'test@testowy.pl' },
                { labelKey: 'password', value: 'Testowe123!' },
            ],
        },
    },
    {
        id: "animalsOnePage",
        categories: ['web'],
        image: animalsThumbnail,
        demoLink: 'https://zwierzeta.netlify.app/#fourty-page',
        githubLink: 'https://github.com/shellty-it/Strona-typu-One-Page',
        year: '2018',
        hasCaseStudy: true,
    }
];

export function getProjects(t, language) {
    return PROJECTS.map(({ imageEn, hasHighlights, hasCaseStudy, ...project }) => {
        const key = `portfolio.projects.${project.id}`;
        return {
            ...project,
            image: language === 'en' && imageEn ? imageEn : project.image,
            title: t(`${key}.title`),
            subtitle: t(`${key}.subtitle`),
            description: t(`${key}.description`),
            technologies: t(`${key}.tech`, { returnObjects: true }),
            role: t(`${key}.role`, { defaultValue: 'Developer' }),
            ...(hasHighlights && {
                highlightsTitle: t(`${key}.highlightsTitle`, { defaultValue: '' }),
                highlights: t(`${key}.highlights`, { returnObjects: true, defaultValue: [] }),
            }),
            ...(hasCaseStudy && {
                caseStudyLink: t(`${key}.case`, { defaultValue: '' }) || null,
            }),
        };
    });
}
