import React, { useState, useRef, useEffect } from 'react';
import './GlowIcon.css';

/**
 * Singleton IntersectionObserver zamiast osobnej instancji per komponent.
 * Jeden observer śledzi wszystkie GlowIcon na stronie — zmniejsza liczbę
 * aktywnych obserwatorów z N (liczba ikon) do 1.
 */
let sharedObserver = null;
const observerCallbacks = new WeakMap();

function getSharedObserver() {
    if (!sharedObserver) {
        sharedObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const cb = observerCallbacks.get(entry.target);
                        if (cb) {
                            cb();
                            sharedObserver.unobserve(entry.target);
                            observerCallbacks.delete(entry.target);
                        }
                    }
                }
            },
            { rootMargin: '200px' }
        );
    }
    return sharedObserver;
}

const GlowIcon = ({ src, srcGlow, alt = '', size, floating = false, className = '' }) => {
    const style = size ? { width: size, height: size } : undefined;
    const [glowReady, setGlowReady] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!srcGlow || !containerRef.current) return;

        const el = containerRef.current;
        const observer = getSharedObserver();

        const onVisible = () => {
            const img = new Image();
            img.src = srcGlow;
            img.onload = () => setGlowReady(true);
        };

        observerCallbacks.set(el, onVisible);
        observer.observe(el);

        return () => {
            observer.unobserve(el);
            observerCallbacks.delete(el);
        };
    }, [srcGlow]);

    return (
        <div
            ref={containerRef}
            className={`glow-icon${floating ? ' glow-icon-float' : ''}${className ? ` ${className}` : ''}`}
            style={style}
        >
            <img
                src={src}
                alt={alt}
                className="glow-icon-base"
                draggable="false"
                loading="lazy"
                decoding="async"
            />
            {glowReady && (
                <img
                    src={srcGlow}
                    alt=""
                    className="glow-icon-lit"
                    draggable="false"
                    aria-hidden="true"
                />
            )}
        </div>
    );
};

export default GlowIcon;
