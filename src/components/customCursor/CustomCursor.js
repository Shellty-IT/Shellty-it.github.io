import React, { useEffect, useRef, useState } from 'react';
import './CustomCursor.css';

const TRAIL_COUNT = 5;
const INTERACTIVE = 'a, button, input, textarea, select, [role="button"], label, [data-cursor]';
const POINTER_QUERY = '(hover: hover) and (pointer: fine)';

/**
 * Style trailsów wyliczone raz jako stała poza komponentem.
 * Poprzednio getTrailStyle(i) był wywoływany przy każdym renderze,
 * tworząc nowe obiekty - teraz są niezmiennymi referencjami.
 */
const TRAIL_STYLES = Array.from({ length: TRAIL_COUNT }, (_, i) => {
    const progress = i / (TRAIL_COUNT - 1);
    const size = 7 - progress * 5;
    const alpha = 0.5 - progress * 0.45;

    return {
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        background: `rgba(0, 229, 255, ${alpha})`,
        boxShadow: i === 0 ? `0 0 4px 2px rgba(0,229,255,${(alpha * 0.35).toFixed(3)})` : 'none',
    };
});

const safeClosest = (target, selector) => {
    if (!target || typeof target.closest !== 'function' || target === document || target === window) return null;
    try { return target.closest(selector); } catch { return null; }
};

const CustomCursor = () => {
    const [hasPointer, setHasPointer] = useState(
        () => typeof window !== 'undefined' && window.matchMedia(POINTER_QUERY).matches
    );

    const dotRef = useRef(null);
    const ringRef = useRef(null);
    const trailRefs = useRef([]);

    useEffect(() => {
        const mql = window.matchMedia(POINTER_QUERY);
        const onChange = (e) => setHasPointer(e.matches);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        if (hasPointer) document.documentElement.classList.add('has-custom-cursor');
        else document.documentElement.classList.remove('has-custom-cursor');
        return () => document.documentElement.classList.remove('has-custom-cursor');
    }, [hasPointer]);

    useEffect(() => {
        if (!hasPointer) return;

        const dot = dotRef.current;
        const ring = ringRef.current;
        const trailElements = trailRefs.current.slice();
        const elements = [dot, ring, ...trailElements];
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const mouse = { x: -100, y: -100 };
        const ringPos = { ...mouse };
        const trails = Array.from({ length: TRAIL_COUNT }, () => ({ ...mouse }));
        let scale = 1, targetScale = 1;
        let visible = false, hovering = false;
        let raf = 0, lastFrame = 0;

        const stopLoop = () => {
            cancelAnimationFrame(raf);
            raf = 0;
            lastFrame = 0;
        };

        function startLoop() {
            if (!raf && visible && !document.hidden) raf = requestAnimationFrame(tick);
        }

        function tick(now) {
            raf = 0;
            // Keep the same trailing motion on 60, 120 and 144 Hz displays.
            const frames = lastFrame ? Math.min((now - lastFrame) / (1000 / 60), 4) : 1;
            lastFrame = now;
            const ease = (speed) => reducedMotion.matches ? 1 : 1 - Math.pow(1 - speed, frames);
            const ringEase = ease(0.16);
            ringPos.x += (mouse.x - ringPos.x) * ringEase;
            ringPos.y += (mouse.y - ringPos.y) * ringEase;
            scale += (targetScale - scale) * ease(0.1);
            ring.style.transform = `translate3d(${ringPos.x}px,${ringPos.y}px,0) scale(${scale})`;

            let settled = Math.abs(scale - targetScale) < 0.001
                && Math.abs(ringPos.x - mouse.x) < 0.1 && Math.abs(ringPos.y - mouse.y) < 0.1;
            if (!reducedMotion.matches) {
                for (let i = 0; i < TRAIL_COUNT; i++) {
                    const prev = i === 0 ? ringPos : trails[i - 1];
                    const trail = trails[i];
                    const speed = ease(0.4 - (i / (TRAIL_COUNT - 1)) * 0.28);
                    trail.x += (prev.x - trail.x) * speed;
                    trail.y += (prev.y - trail.y) * speed;
                    trailElements[i].style.transform = `translate3d(${trail.x}px,${trail.y}px,0)`;
                    settled = settled && Math.abs(trail.x - mouse.x) < 0.8 && Math.abs(trail.y - mouse.y) < 0.8;
                }
            }
            if (settled) lastFrame = 0;
            else startLoop();
        }

        const updateHover = (e) => {
            if (e.pointerType === 'touch') return;
            const next = !!safeClosest(e.target, INTERACTIVE);
            if (next === hovering) return;
            hovering = next;
            targetScale = hovering ? 1.12 : 1;
            ring.classList.toggle('hovering', hovering);
            dot.classList.toggle('hovering', hovering);
            startLoop();
        };

        const onPointerMove = (e) => {
            if (e.pointerType === 'touch') return;
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            // The tip tracks the input immediately; only the decoration trails.
            const transform = `translate3d(${mouse.x}px,${mouse.y}px,0)`;
            dot.style.transform = transform;
            if (!visible) {
                visible = true;
                Object.assign(ringPos, mouse);
                trails.forEach(trail => Object.assign(trail, mouse));
                elements.forEach(el => {
                    el.style.transform = transform;
                    el.style.opacity = '1';
                });
                updateHover(e);
            }
            startLoop();
        };

        const hide = () => {
            visible = false;
            hovering = false;
            targetScale = scale = 1;
            stopLoop();
            elements.forEach(el => { el.style.opacity = '0'; });
            ring.classList.remove('hovering');
            dot.classList.remove('hovering');
        };
        const onVisibilityChange = () => {
            if (document.hidden) hide();
        };

        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('pointerover', updateHover, { passive: true });
        window.addEventListener('blur', hide);
        document.documentElement.addEventListener('pointerleave', hide);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            stopLoop();
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerover', updateHover);
            window.removeEventListener('blur', hide);
            document.documentElement.removeEventListener('pointerleave', hide);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [hasPointer]);

    if (!hasPointer) return null;

    return (
        <div className="cursor-container" aria-hidden="true">
            {TRAIL_STYLES.map((s, i) => (
                <div
                    key={i}
                    ref={el => (trailRefs.current[i] = el)}
                    className="cursor-trail-dot"
                    style={s}
                />
            ))}
            <div ref={ringRef} className="cursor-ring" />
            <div ref={dotRef} className="cursor-dot" />
        </div>
    );
};

export default CustomCursor;
