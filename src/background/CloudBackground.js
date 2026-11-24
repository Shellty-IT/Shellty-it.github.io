import React, { useRef, useEffect } from 'react';
import { createMeshHost } from './meshEngine';
import { BACKGROUND_PAUSE_EVENT } from './backgroundPause';
import './CloudBackground.css';

const INTERACTIVE = 'a,button,input,textarea,select,[role="button"]';

function createMeshWorker(canvas) {
    if (typeof Worker !== 'function' || typeof canvas.transferControlToOffscreen !== 'function') return null;
    try {
        return new Worker(new URL('./mesh.worker.js', import.meta.url));
    } catch {
        return null;
    }
}

const CloudBackground = () => {
    const wrapperRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        const canvas = canvasRef.current;
        if (!wrapper || !canvas) return;

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let visible = true;
        let paused = false;
        let canGrab = false;
        let started = false;
        let send = () => {};
        let stop = () => {};

        const setDragging = (on) => document.body.classList.toggle('is-node-drag', on);

        const onReply = (msg) => {
            if (msg.type === 'hover') canGrab = msg.canGrab;
            else if (msg.type === 'grab') setDragging(msg.grabbed);
        };

        const viewport = () => {
            const rect = wrapper.getBoundingClientRect();
            return {
                width: rect.width,
                height: rect.height,
                dpr: window.devicePixelRatio || 1,
                small: window.matchMedia('(max-width: 820px)').matches,
            };
        };

        const initMessage = (target) => ({
            type: 'init', canvas: target, reduced, visible: visible && !paused, hidden: document.hidden, ...viewport(),
        });

        const startLocal = () => {
            const host = createMeshHost(onReply);
            started = true;
            send = host;
            stop = () => host({ type: 'dispose' });
            host(initMessage(canvas));
        };

        const worker = createMeshWorker(canvas);
        if (worker) {
            stop = () => worker.terminate();
            worker.onmessage = ({ data }) => {
                if (data.type !== 'ready') {
                    onReply(data);
                    return;
                }
                started = true;
                const offscreen = canvas.transferControlToOffscreen();
                send = (msg) => worker.postMessage(msg);
                worker.postMessage(initMessage(offscreen), [offscreen]);
            };
            worker.onerror = () => {
                if (started) return;
                worker.terminate();
                startLocal();
            };
        } else {
            startLocal();
        }

        let resizeTimer;
        const onResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => send({ type: 'resize', ...viewport() }), 220);
        };

        const onVisibility = () => send({ type: 'hidden', value: document.hidden });

        // Gdy root jest nierozwiązywalny (np. osadzenie w iframe cross-origin),
        // traktujemy warstwę jako widoczną - inaczej pętla animacji nigdy by nie ruszyła.
        const observer = new IntersectionObserver((entries) => {
            const entry = entries[entries.length - 1];
            visible = entry.isIntersecting || entry.rootBounds === null;
            send({ type: 'visible', value: visible && !paused });
        }, { root: null, threshold: 0 });
        observer.observe(document.body);

        const onPause = ({ detail }) => {
            paused = detail;
            wrapper.classList.toggle('is-paused', paused);
            send({ type: 'visible', value: visible && !paused });
        };
        window.addEventListener(BACKGROUND_PAUSE_EVENT, onPause);

        // Bez throttlingu: zapis pozycji to dwie liczby, a każde pominięte
        // zdarzenie widać wprost jako szarpanie węzłów pod kursorem.
        const onPointerMove = (e) => send({ type: 'move', x: e.clientX, y: e.clientY });

        const onPointerDown = (e) => {
            if (e.target.closest(INTERACTIVE)) return;
            if (canGrab && e.pointerType === 'mouse') setDragging(true);
            send({ type: 'down', x: e.clientX, y: e.clientY });
        };

        const onPointerRelease = () => {
            send({ type: 'up' });
            setDragging(false);
        };

        const onPointerLeave = () => send({ type: 'leave' });

        window.addEventListener('resize', onResize);
        document.addEventListener('visibilitychange', onVisibility);

        if (!reduced) {
            window.addEventListener('pointermove', onPointerMove, { passive: true });
            window.addEventListener('pointerdown', onPointerDown, { passive: true });
            window.addEventListener('pointerup', onPointerRelease, { passive: true });
            window.addEventListener('pointercancel', onPointerRelease, { passive: true });
            window.addEventListener('pointerleave', onPointerLeave, { passive: true });
        }

        return () => {
            clearTimeout(resizeTimer);
            observer.disconnect();
            window.removeEventListener(BACKGROUND_PAUSE_EVENT, onPause);
            window.removeEventListener('resize', onResize);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointerup', onPointerRelease);
            window.removeEventListener('pointercancel', onPointerRelease);
            window.removeEventListener('pointerleave', onPointerLeave);
            stop();
        };
    }, []);

    return (
        <div className="cloud-bg-wrapper" ref={wrapperRef} aria-hidden="true">
            <div className="cloud-bg-grid-mask">
                <div className="cloud-bg-grid" />
            </div>
            <canvas ref={canvasRef} className="cloud-bg-canvas" />
        </div>
    );
};

export default React.memo(CloudBackground);
