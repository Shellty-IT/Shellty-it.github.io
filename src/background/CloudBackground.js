import React, { useRef, useEffect } from 'react';
import './CloudBackground.css';

function sprite(size, stops) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const r = size / 2;
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    for (const [pos, color] of stops) g.addColorStop(pos, color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return c;
}

const NODE = sprite(64, [
    [0, 'rgba(214,243,255,1)'],
    [0.14, 'rgba(12,192,255,.42)'],
    [0.42, 'rgba(0,98,176,.10)'],
    [1, 'rgba(0,40,90,0)'],
]);
const PULSE = sprite(40, [
    [0, 'rgba(232,250,255,1)'],
    [0.22, 'rgba(12,192,255,.55)'],
    [1, 'rgba(0,60,130,0)'],
]);

const TIER_A = [0.035, 0.075, 0.13];

class MeshEngine {
    constructor(canvas, reduced) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: true });
        this.reduced = reduced;
        this.small = window.matchMedia('(max-width: 820px)');
        this.W = 0; this.H = 0;
        this.nodes = [];
        this.pulses = [];
        this.tiers = [[], [], []];
        this.mouse = { x: -9000, y: -9000, on: false };
        this.hover = null;
        this.drag = null;
        this.dragPX = 0; this.dragPY = 0;
        this.raf = 0;
        this.last = 0;
        this.visible = true;
        this.P = {};
        this._profile();
    }

    _profile() {
        const s = this.small.matches;
        this.P = {
            fps: s ? 24 : 30,
            dpr: Math.min(window.devicePixelRatio || 1, s ? 1 : 1.5),
            count: s ? 13 : 26,
            linkDist: s ? 145 : 185,
            maxPulse: s ? 2 : 3,
            speed: 5.5,
            grab: s ? 44 : 34,
            pull: s ? 0 : 9,
        };
    }

    _build() {
        this.nodes = [];
        const m = 40;
        for (let i = 0; i < this.P.count; i++) {
            const a = Math.random() * 6.283;
            this.nodes.push({
                x: m + Math.random() * (this.W - m * 2),
                y: m + Math.random() * (this.H - m * 2),
                vx: Math.cos(a) * this.P.speed,
                vy: Math.sin(a) * this.P.speed * 0.6,
                r: 1.6 + Math.random() * 2.6,
                ph: Math.random() * 6.283,
                sp: 0.35 + Math.random() * 0.5,
                near: 0,
            });
        }
        this.pulses = [];
    }

    resize(w, h) {
        this.W = Math.round(w); this.H = Math.round(h);
        this._profile();
        this.canvas.width = Math.round(this.W * this.P.dpr);
        this.canvas.height = Math.round(this.H * this.P.dpr);
        this.ctx.setTransform(this.P.dpr, 0, 0, this.P.dpr, 0, 0);
        this._build();
    }

    _step(dt) {
        const P = this.P;
        let best = null, bestD = P.grab * P.grab;
        for (const n of this.nodes) {
            if (n === this.drag) {
                n.x = this.mouse.x; n.y = this.mouse.y; n.near = 1;
                continue;
            }
            n.x += n.vx * dt; n.y += n.vy * dt;
            if (this.mouse.on) {
                const dx = n.x - this.mouse.x, dy = n.y - this.mouse.y, d2 = dx * dx + dy * dy;
                n.near = d2 < 42000 ? 1 - d2 / 42000 : 0;
                if (n.near && P.pull) {
                    const d = Math.sqrt(d2) || 1, f = n.near * n.near * P.pull * dt;
                    n.x -= (dx / d) * f; n.y -= (dy / d) * f;
                }
                if (!this.drag && d2 < bestD) { bestD = d2; best = n; }
            } else n.near = 0;
            if (n.x < -60) n.x = this.W + 60; else if (n.x > this.W + 60) n.x = -60;
            if (n.y < -60) n.y = this.H + 60; else if (n.y > this.H + 60) n.y = -60;
        }
        if (best !== this.hover) this.hover = best;

        const tiers = this.tiers;
        tiers[0].length = tiers[1].length = tiers[2].length = 0;
        const L = P.linkDist, L2 = L * L;
        const nodes = this.nodes;
        for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i];
            for (let j = i + 1; j < nodes.length; j++) {
                const b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
                if (d2 > L2) continue;
                const t = 1 - Math.sqrt(d2) / L;
                tiers[t < 0.34 ? 0 : t < 0.68 ? 1 : 2].push(a, b);
            }
        }

        if (this.pulses.length < P.maxPulse && tiers[2].length && Math.random() < 0.022) {
            const k = (Math.random() * (tiers[2].length / 2) | 0) * 2;
            this.pulses.push({ a: tiers[2][k], b: tiers[2][k + 1], t: 0, s: 0.28 + Math.random() * 0.3 });
        }
        for (let i = this.pulses.length - 1; i >= 0; i--) {
            const p = this.pulses[i]; p.t += p.s * dt;
            if (p.t >= 1) this.pulses.splice(i, 1);
        }
    }

    _draw(time) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.W, this.H);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgb(12,176,240)';
        for (let t = 0; t < 3; t++) {
            const arr = this.tiers[t]; if (!arr.length) continue;
            ctx.globalAlpha = TIER_A[t];
            ctx.beginPath();
            for (let i = 0; i < arr.length; i += 2) {
                ctx.moveTo(arr[i].x, arr[i].y);
                ctx.lineTo(arr[i + 1].x, arr[i + 1].y);
            }
            ctx.stroke();
        }
        for (const p of this.pulses) {
            const e = Math.min(p.t * 5, 1) * Math.min((1 - p.t) * 5, 1);
            ctx.globalAlpha = e * 0.34;
            const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
            ctx.drawImage(PULSE, x - 9, y - 9, 18, 18);
        }

        const act = this.drag || this.hover;
        if (act) {
            const L = this.P.linkDist * 1.25, L2 = L * L;
            ctx.globalAlpha = this.drag ? 0.30 : 0.20;
            ctx.beginPath();
            for (const n of this.nodes) {
                if (n === act) continue;
                const dx = n.x - act.x, dy = n.y - act.y;
                if (dx * dx + dy * dy > L2) continue;
                ctx.moveTo(act.x, act.y); ctx.lineTo(n.x, n.y);
            }
            ctx.stroke();
        }

        for (const n of this.nodes) {
            const tw = 0.62 + 0.38 * Math.sin(n.ph + time * n.sp);
            const boost = n === act ? (this.drag ? 2.6 : 1.9) : 1;
            const s = n.r * 7 * (1 + n.near * 0.18) * (n === act ? 1.22 : 1);
            ctx.globalAlpha = Math.min((0.20 + 0.16 * tw) * (1 + n.near * 1.5) * boost, 1);
            ctx.drawImage(NODE, n.x - s, n.y - s, s * 2, s * 2);
        }
        ctx.globalAlpha = 1;
    }

    _loop = (now) => {
        this.raf = requestAnimationFrame(this._loop);
        const iv = 1000 / this.P.fps, el = now - this.last;
        if (el < iv) return;
        this.last = now - (el % iv);
        this._step(Math.min(el / 1000, 0.06));
        this._draw(now / 1000);
    };

    play() {
        if (!this.raf && this.visible && !document.hidden && !this.reduced) {
            this.last = performance.now();
            this.raf = requestAnimationFrame(this._loop);
        }
    }

    pause() {
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    }

    renderStatic() { this._step(0); this._draw(0); }

    setMouse(x, y) {
        this.mouse.x = x; this.mouse.y = y; this.mouse.on = true;
        if (this.drag) {
            this.drag.vx = (x - this.dragPX) * 6;
            this.drag.vy = (y - this.dragPY) * 6;
            this.dragPX = x; this.dragPY = y;
        }
    }

    clearMouse() { if (!this.drag) this.mouse.on = false; }

    tryGrab(x, y) {
        this.mouse.x = x; this.mouse.y = y; this.mouse.on = true;
        let best = null, bestD = this.P.grab * this.P.grab;
        for (const n of this.nodes) {
            const dx = n.x - x, dy = n.y - y, d2 = dx * dx + dy * dy;
            if (d2 < bestD) { bestD = d2; best = n; }
        }
        if (!best) return false;
        this.drag = best; this.dragPX = x; this.dragPY = y;
        return true;
    }

    release() {
        if (!this.drag) return;
        const v = Math.hypot(this.drag.vx, this.drag.vy), cap = 55;
        if (v > cap) { this.drag.vx *= cap / v; this.drag.vy *= cap / v; }
        if (v < 1) {
            const a = Math.random() * 6.283;
            this.drag.vx = Math.cos(a) * this.P.speed;
            this.drag.vy = Math.sin(a) * this.P.speed * 0.6;
        }
        this.drag = null;
    }

    settleSpeeds() {
        if (document.hidden) return;
        for (const n of this.nodes) {
            if (n === this.drag) continue;
            const v = Math.hypot(n.vx, n.vy);
            if (v > this.P.speed * 1.05) {
                const k = Math.max(this.P.speed / v, 0.93);
                n.vx *= k; n.vy *= k;
            }
        }
    }

    dispose() {
        this.pause();
        this.nodes = []; this.pulses = [];
        this.tiers = [[], [], []];
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
        const engine = new MeshEngine(canvas, reduced);

        const resize = () => {
            const rect = wrapper.getBoundingClientRect();
            engine.resize(rect.width, rect.height);
            if (reduced) engine.renderStatic();
        };
        resize();
        if (reduced) engine.renderStatic();
        else engine.play();

        let resizeTimer;
        const onResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resize, 220);
        };

        const onVisibility = () => (document.hidden ? engine.pause() : engine.play());

        const observer = new IntersectionObserver((entries) => {
            engine.visible = entries[0].isIntersecting;
            engine.visible ? engine.play() : engine.pause();
        });
        observer.observe(wrapper);

        let moveThrottle = 0;
        const onPointerMove = (e) => {
            if (engine.drag) {
                engine.setMouse(e.clientX, e.clientY);
                return;
            }
            const now = performance.now();
            if (now - moveThrottle < 60) return;
            moveThrottle = now;
            engine.setMouse(e.clientX, e.clientY);
        };

        const onPointerDown = (e) => {
            if (e.target.closest('a,button,input,textarea,select,[role="button"]')) return;
            if (!engine.tryGrab(e.clientX, e.clientY)) return;
            document.body.classList.add('is-node-drag');
            engine.play();
        };

        const onPointerRelease = () => {
            engine.release();
            document.body.classList.remove('is-node-drag');
        };

        const onPointerLeave = () => engine.clearMouse();

        const settleInterval = setInterval(() => engine.settleSpeeds(), 200);

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
            clearInterval(settleInterval);
            observer.disconnect();
            window.removeEventListener('resize', onResize);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointerup', onPointerRelease);
            window.removeEventListener('pointercancel', onPointerRelease);
            window.removeEventListener('pointerleave', onPointerLeave);
            engine.dispose();
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
