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

const TIER_A = [0.032, 0.068, 0.12];
const NB = [1, 0, -1, 1, 0, 1, 1, 1];
const R_MAX = 5.6, R_MIN = 1.25;

/* Zasięg wpływu kursora (px²) - porównujemy kwadraty odległości, bez sqrt. */
const NEAR_D2 = 22000;

/* Fuzja/rozpad to proces wolnozmienny - liczony co N klatek z sumarycznym dt,
   dzięki czemu prawdopodobieństwa pozostają poprawne w czasie. */
const FUSE_EVERY = 4;

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
        this.cells = []; this.gW = 0; this.gH = 0; this.cs = 0;
        this._spawn = [];
        this._fuseTick = 0;
        this._fuseDt = 0;
        this._cost = 0;          // EMA kosztu klatki (ms)
        this._checkTick = 0;
        this._degraded = 0;
        this._dprCap = Infinity;
        this._countScale = 1;
        this.P = {};
        this._profile();
    }

    _profile() {
        const s = this.small.matches;
        this.P = {
            /* Brak sztucznego limitu FPS - pętla biegnie w rytmie ekranu.
               Praca na klatkę jest liniowa względem liczby węzłów, więc
               płynność kursora zyskuje więcej niż kosztuje CPU.
               _dprCap / _countScale niosą decyzje samoregulacji, dlatego
               przeżywają odbudowę profilu przy zmianie rozmiaru okna. */
            dpr: Math.min(window.devicePixelRatio || 1, s ? 1 : 1.25, this._dprCap),
            count: Math.max(16, ((s ? 20 : 40) * this._countScale) | 0),
            linkDist: s ? 130 : 165,
            maxPulse: s ? 2 : 3,
            speed: 5.5,
            grab: s ? 44 : 34,
            pull: s ? 8 : 26,
        };
        this._linkTiers();
    }

    /* Progi przynależności do warstw wyrażone w kwadratach odległości:
       t = 1 - d/L, więc t < .34 ⟺ d² > (.66L)², t < .68 ⟺ d² > (.32L)².
       Pozwala to wyeliminować sqrt z najgorętszej pętli. */
    _linkTiers() {
        const L = this.P.linkDist;
        this.L2 = L * L;
        this.T0 = (0.66 * L) * (0.66 * L);
        this.T1 = (0.32 * L) * (0.32 * L);
    }

    _mkNode(x, y, r, a) {
        const ang = a === undefined ? Math.random() * 6.283 : a;
        return {
            x, y,
            vx: Math.cos(ang) * this.P.speed,
            vy: Math.sin(ang) * this.P.speed * 0.6,
            r, ph: Math.random() * 6.283, sp: 0.35 + Math.random() * 0.5,
            near: 0, cd: 0.6 + Math.random() * 0.8, born: 0, dead: 0,
        };
    }

    _build() {
        this.nodes = [];
        const m = 40;
        for (let i = 0; i < this.P.count; i++) {
            this.nodes.push(this._mkNode(
                m + Math.random() * (this.W - m * 2),
                m + Math.random() * (this.H - m * 2),
                1.5 + Math.random() * 2.2,
            ));
        }
        this.pulses = [];
        this.cells = []; this.gW = 0; this.gH = 0;
    }

    resize(w, h) {
        this.W = Math.round(w); this.H = Math.round(h);
        this._profile();
        this.canvas.width = Math.round(this.W * this.P.dpr);
        this.canvas.height = Math.round(this.H * this.P.dpr);
        this.ctx.setTransform(this.P.dpr, 0, 0, this.P.dpr, 0, 0);
        this._build();
    }

    _grid() {
        this.cs = this.P.linkDist;
        const w = Math.max(1, Math.ceil((this.W + 240) / this.cs));
        const h = Math.max(1, Math.ceil((this.H + 240) / this.cs));
        if (w !== this.gW || h !== this.gH) {
            this.gW = w; this.gH = h;
            this.cells = Array.from({ length: this.gW * this.gH }, () => []);
        } else {
            for (let i = 0; i < this.cells.length; i++) this.cells[i].length = 0;
        }
        for (const n of this.nodes) {
            let cx = ((n.x + 120) / this.cs) | 0, cy = ((n.y + 120) / this.cs) | 0;
            if (cx < 0) cx = 0; else if (cx >= this.gW) cx = this.gW - 1;
            if (cy < 0) cy = 0; else if (cy >= this.gH) cy = this.gH - 1;
            n.c = cy * this.gW + cx;
            this.cells[n.c].push(n);
        }
    }

    _links() {
        const tiers = this.tiers;
        tiers[0].length = tiers[1].length = tiers[2].length = 0;
        const { L2, T0, T1, cells, gW, gH } = this;
        for (let ci = 0; ci < cells.length; ci++) {
            const A = cells[ci]; if (!A.length) continue;
            const cx = ci % gW, cy = (ci / gW) | 0;
            for (let i = 0; i < A.length; i++) {
                const a = A[i], ax = a.x, ay = a.y;
                for (let j = i + 1; j < A.length; j++) {
                    const b = A[j], dx = ax - b.x, dy = ay - b.y, d2 = dx * dx + dy * dy;
                    if (d2 > L2) continue;
                    (d2 > T0 ? tiers[0] : d2 > T1 ? tiers[1] : tiers[2]).push(a, b);
                }
                for (let k = 0; k < 4; k++) {
                    const nx = cx + NB[k * 2], ny = cy + NB[k * 2 + 1];
                    if (nx < 0 || nx >= gW || ny >= gH) continue;
                    const B = cells[ny * gW + nx];
                    for (let j = 0; j < B.length; j++) {
                        const b = B[j], dx = ax - b.x, dy = ay - b.y, d2 = dx * dx + dy * dy;
                        if (d2 > L2) continue;
                        (d2 > T0 ? tiers[0] : d2 > T1 ? tiers[1] : tiers[2]).push(a, b);
                    }
                }
            }
        }
    }

    _fuse(dt) {
        for (const A of this.cells) {
            for (let i = 0; i < A.length; i++) {
                const a = A[i]; if (a.dead || a.cd > 0 || a === this.drag) continue;
                for (let j = i + 1; j < A.length; j++) {
                    const b = A[j]; if (b.dead || b.cd > 0 || b === this.drag) continue;
                    const dx = a.x - b.x, dy = a.y - b.y, t = (a.r + b.r) * 1.9;
                    if (dx * dx + dy * dy > t * t) continue;
                    const ma = a.r * a.r, mb = b.r * b.r, m = ma + mb;
                    if (m > R_MAX * R_MAX) continue;
                    a.x = (a.x * ma + b.x * mb) / m; a.y = (a.y * ma + b.y * mb) / m;
                    a.vx = (a.vx * ma + b.vx * mb) / m; a.vy = (a.vy * ma + b.vy * mb) / m;
                    a.r = Math.sqrt(m); a.cd = 1.4 + Math.random() * 1.6; a.born = 0.55;
                    b.dead = 1;
                    break;
                }
            }
        }

        const spawn = this._spawn;
        spawn.length = 0;
        const nodes = this.nodes;
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (n.dead || n === this.drag || n.cd > 0 || n.r < 2.9) continue;
            const p = (n.r - 2.9) / (R_MAX - 2.9);
            if (Math.random() > p * p * 0.5 * dt) continue;
            const m = n.r * n.r, k = 0.38 + Math.random() * 0.24;
            const r1 = Math.sqrt(m * k), r2 = Math.sqrt(m * (1 - k));
            if (r1 < R_MIN || r2 < R_MIN) continue;
            const a = Math.random() * 6.283, sp = 11 + Math.random() * 9, off = n.r * 1.6;
            const c = Math.cos(a), si = Math.sin(a);
            n.r = r1; n.x += c * off; n.y += si * off;
            n.vx += c * sp; n.vy += si * sp; n.cd = 2 + Math.random() * 2; n.born = 0.5;
            const q = this._mkNode(n.x - c * off * 2, n.y - si * off * 2, r2);
            q.vx = n.vx - c * sp * 2; q.vy = n.vy - si * sp * 2;
            q.cd = n.cd; q.born = 0.5;
            spawn.push(q);
        }

        /* Kompaktowanie w miejscu - tańsze niż splice() dla każdego trupa. */
        let w = 0;
        for (let i = 0; i < nodes.length; i++) if (!nodes[i].dead) nodes[w++] = nodes[i];
        nodes.length = w;
        for (let i = 0; i < spawn.length; i++) nodes.push(spawn[i]);

        /* Impulsy trzymają referencje do węzłów - porzucamy te, których
           koniec właśnie zniknął, żeby nie lecieć do zamrożonej pozycji. */
        for (let i = this.pulses.length - 1; i >= 0; i--) {
            const p = this.pulses[i];
            if (p.a.dead || p.b.dead) this.pulses.splice(i, 1);
        }
    }

    _step(dt) {
        const P = this.P, nodes = this.nodes;
        const mOn = this.mouse.on, mx = this.mouse.x, my = this.mouse.y;
        let best = null, bestD = P.grab * P.grab;

        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (n === this.drag) {
                n.x = mx; n.y = my; n.near = 1;
                continue;
            }
            n.x += n.vx * dt; n.y += n.vy * dt;
            if (n.cd > 0) n.cd -= dt;
            if (n.born < 1) n.born = n.born + dt * 1.6 > 1 ? 1 : n.born + dt * 1.6;
            if (mOn) {
                const dx = n.x - mx, dy = n.y - my, d2 = dx * dx + dy * dy;
                if (d2 < NEAR_D2) {
                    n.near = 1 - d2 / NEAR_D2;
                    if (P.pull) {
                        const d = Math.sqrt(d2) || 1, f = n.near * n.near * P.pull * dt;
                        n.x -= (dx / d) * f; n.y -= (dy / d) * f;
                    }
                    if (!this.drag && d2 < bestD) { bestD = d2; best = n; }
                } else n.near = 0;
            } else n.near = 0;
            if (n.x < -60) n.x = this.W + 60; else if (n.x > this.W + 60) n.x = -60;
            if (n.y < -60) n.y = this.H + 60; else if (n.y > this.H + 60) n.y = -60;
        }
        this.hover = best;

        this._grid();
        this._links();

        this._fuseDt += dt;
        if (++this._fuseTick >= FUSE_EVERY) {
            this._fuseTick = 0;
            this._fuse(this._fuseDt);
            this._fuseDt = 0;
        }

        const t2 = this.tiers[2];
        if (this.pulses.length < P.maxPulse && t2.length && Math.random() < 0.022) {
            const k = (Math.random() * (t2.length / 2) | 0) * 2;
            this.pulses.push({ a: t2[k], b: t2[k + 1], t: 0, s: 0.28 + Math.random() * 0.3 });
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

        const nodes = this.nodes;
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            const tw = 0.62 + 0.38 * Math.sin(n.ph + time * n.sp);
            const boost = n === act ? (this.drag ? 2.6 : 1.9) : 1;
            const s = n.r * 7 * (1 + n.near * 0.18) * (n === act ? 1.22 : 1) * (0.55 + 0.45 * n.born);
            const a = (0.20 + 0.16 * tw) * (1 + n.near * 1.5) * boost * (0.3 + 0.7 * n.born);
            ctx.globalAlpha = a > 1 ? 1 : a;
            ctx.drawImage(NODE, n.x - s, n.y - s, s * 2, s * 2);
        }
        ctx.globalAlpha = 1;
    }

    /* Samoregulacja: mierzymy realny koszt klatki (nie interwał, który zawiera
       bezczynność przeglądarki). Przy trwale drogich klatkach redukujemy scenę.
       Degradacja jest jednokierunkowa - unika oscylacji tam i z powrotem. */
    _monitor(cost) {
        this._cost += (cost - this._cost) * 0.05;
        if (++this._checkTick < 90) return;
        this._checkTick = 0;
        if (this._cost < 6 || this._degraded >= 2) return;
        this._degraded++;
        if (this._degraded === 1 && this.P.dpr > 1) {
            this._dprCap = 1;
            this.P.dpr = 1;
            this.canvas.width = Math.round(this.W * this.P.dpr);
            this.canvas.height = Math.round(this.H * this.P.dpr);
            this.ctx.setTransform(this.P.dpr, 0, 0, this.P.dpr, 0, 0);
        } else {
            this._countScale *= 0.7;
            this.P.count = Math.max(16, (this.P.count * 0.7) | 0);
            if (this.nodes.length > this.P.count) this.nodes.length = this.P.count;
        }
        this._cost = 0;
    }

    _loop = (now) => {
        this.raf = requestAnimationFrame(this._loop);
        let dt = (now - this.last) / 1000;
        this.last = now;
        if (dt > 0.06) dt = 0.06;      // po powrocie z tła nie „teleportujemy” sceny
        else if (dt <= 0) return;
        const t0 = performance.now();
        this._step(dt);
        this._draw(now / 1000);
        this._monitor(performance.now() - t0);
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

    renderStatic() { this._step(0.016); this._draw(0); }

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
        const d = this.drag;
        const v = Math.sqrt(d.vx * d.vx + d.vy * d.vy), cap = 55;
        if (v > cap) { d.vx *= cap / v; d.vy *= cap / v; }
        if (v < 1) {
            const a = Math.random() * 6.283;
            d.vx = Math.cos(a) * this.P.speed;
            d.vy = Math.sin(a) * this.P.speed * 0.6;
        }
        this.drag = null;
    }

    settleSpeeds() {
        if (document.hidden) return;
        const base = this.P.speed, lim = base * 1.05, lim2 = lim * lim;
        for (const n of this.nodes) {
            if (n === this.drag) continue;
            const v2 = n.vx * n.vx + n.vy * n.vy;
            if (v2 <= lim2) continue;
            const k = Math.max(base / Math.sqrt(v2), 0.93);
            n.vx *= k; n.vy *= k;
        }
    }

    dispose() {
        this.pause();
        this.nodes = []; this.pulses = [];
        this.tiers = [[], [], []];
        this.cells = []; this._spawn = [];
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

        // Gdy root jest nierozwiązywalny (np. osadzenie w iframe cross-origin),
        // traktujemy warstwę jako widoczną - inaczej pętla animacji nigdy by nie ruszyła.
        const observer = new IntersectionObserver((entries) => {
            const entry = entries[entries.length - 1];
            engine.visible = entry.isIntersecting || entry.rootBounds === null;
            engine.visible ? engine.play() : engine.pause();
        }, { root: null, threshold: 0 });
        observer.observe(document.body);

        // Bez throttlingu: zapis pozycji to dwie liczby, a każde pominięte
        // zdarzenie widać wprost jako szarpanie węzłów pod kursorem.
        const onPointerMove = (e) => engine.setMouse(e.clientX, e.clientY);

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
