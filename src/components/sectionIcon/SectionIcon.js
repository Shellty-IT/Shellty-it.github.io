import React, { memo } from 'react';
import { useIconPhase } from '../../hooks/useIconPhase';

// Wspólna animacja zachowuje klasy CSS sekcji i nie renderuje ponownie jej treści.
const SectionIcon = memo(function SectionIcon({ className, nodes, icon, glow, size = '160' }) {
    const { iconRef, iconPhase } = useIconPhase(`${className}--pulse`);

    return (
        <div ref={iconRef} className={`${className} ${className}--${iconPhase}`}>
            <div className={`${className}__nodes`} aria-hidden="true">
                {nodes.map(({ id, x, y }) => (
                    <span key={id} className={`${className}__node`} style={{ left: x, top: y }} />
                ))}
            </div>
            {[[icon, 'base'], [glow, 'lit']].map(([src, variant]) => (
                <img
                    key={variant}
                    src={src}
                    alt=""
                    aria-hidden="true"
                    className={`${className}__img ${className}__img--${variant}`}
                    draggable="false"
                    width={size}
                    height={size}
                />
            ))}
        </div>
    );
});

export default SectionIcon;
