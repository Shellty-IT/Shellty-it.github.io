import React from 'react';
import './PulseGlow.css';

const SPACES = /(\s+)/;

const glowWord = (word, key) => (
    <span key={key} className="pulse-glow__word">
        <span className="pulse-glow__halo" data-text={word} aria-hidden="true" />
        {word}
    </span>
);

const glowText = (text) => text.split(SPACES).map((part, i) => (part.trim() ? glowWord(part, i) : part));

const PulseGlow = ({ as: Tag = 'span', children, ...props }) => (
    <Tag {...props}>
        {React.Children.map(children, (child) => (typeof child === 'string' ? glowText(child) : child))}
    </Tag>
);

export function withPulseGlow(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    for (const glow of template.content.querySelectorAll('.warning-glow')) {
        for (const node of [...glow.childNodes]) {
            if (node.nodeType !== Node.TEXT_NODE) continue;
            node.replaceWith(...node.textContent.split(SPACES).map((part) => {
                if (!part.trim()) return part;
                const word = document.createElement('span');
                const halo = document.createElement('span');
                word.className = 'pulse-glow__word';
                halo.className = 'pulse-glow__halo';
                halo.dataset.text = part;
                halo.setAttribute('aria-hidden', 'true');
                word.append(halo, part);
                return word;
            }));
        }
    }
    return template.innerHTML;
}

export default PulseGlow;
