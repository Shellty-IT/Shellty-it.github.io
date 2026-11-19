import pl from '../locales/pl/translation.json';

const sources = { qualifier: 'Formularz krokowy', chat: 'Czat' };
const { fields, callTimes } = pl.qualifier.contact;
const extraLabels = { ...fields, siteUrl: 'Adres strony' };

function formatAnswer(key, value) {
    const step = pl.qualifier.steps[key];
    const label = step?.summary ?? extraLabels[key] ?? key;
    const values = (Array.isArray(value) ? value : [value]).map((item) => {
        if (typeof item === 'boolean') return item ? 'Tak' : 'Nie';
        if (key === 'callTime') return callTimes[item] ?? item;
        return step?.options?.[item]?.label ?? item;
    });
    return `${label}: ${values.join(', ')}`;
}

export function leadEmail(lead, reference, note) {
    const source = sources[lead.source];
    const answers = Object.entries(lead.answers ?? {}).map(([key, value]) => formatAnswer(key, value));
    const form = new FormData();
    form.set('subject', `${note ? 'Dopisek do zgłoszenia' : 'Nowe zgłoszenie'} Shellty · ${source}`);
    if (lead.name) form.set('name', lead.name);
    if (lead.email) form.set('email', lead.email);
    if (lead.fax) form.set('_gotcha', lead.fax);
    form.set('message', [
        `Numer zgłoszenia: ${reference}`,
        lead.phone && `Telefon: ${lead.phone}`,
        note && `Dopisek od klienta\n${note}`,
        answers.length && `Odpowiedzi i szczegóły\n${answers.join('\n')}`,
        lead.chatSummary && `Wiadomości klienta w czacie\n${lead.chatSummary}`,
        lead.page && `Podstrona: ${lead.page}`,
        lead.consentText && `Zgoda na kontakt\n${lead.consentText}`,
    ].filter(Boolean).join('\n\n'));
    return form;
}
