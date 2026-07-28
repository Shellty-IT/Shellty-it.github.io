import React, { useRef, useEffect } from 'react';
import './CloudBackground.css';

const CONFIG = {
    nodes:       { small: 7, medium: 3, large: 1 },
    scrollNodes: { small: 6, medium: 2, large: 1 },
    maxConnectionDist: 180,
    maxConnectionsPerNode: 2,
    connectionBaseOpacity: 0.035,
    flowSpawnChance: 0.003,
    flowSpawnScrollMultiplier: 2,
    maxPulses: 10,
    pulseSpeedRange: [0.25, 0.55],
    driftSpeed: 0.08,
    flowSpeedRange: [0.2, 0.45],
    mouseInteractRadius: 160,
    mouseRepelForce: 15,
    mouseBrightnessBoost: 0.35,
    mouseSizeBoost: 0.1,
    mouseAuraRadius: 200,
    mouseAuraOpacity: 0.035,
    mouseLerp: 0.2,
    scrollBrightness: 0.4,

    starCount: 35,
    starCountStatic: 25,
    ambientParticleCount: 6,

    autoscaleChance: 0.0003,
    autoscaleFadeDuration: 2.5,
    maxDPR: 0.5,
    fpsWindow: 30,
    fpsLowThreshold: 24,
    fpsHighThreshold: 30,
    starRedrawInterval: 12,
    connectionRebuildInterval: 9,

    layers: [
        { depth: 0.15, brightness: 0.25 },  // było 0.20
        { depth: 0.45, brightness: 0.60 },  // było 0.50
        { depth: 0.80, brightness: 0.90 },  // było 0.80
        { depth: 1.00, brightness: 1.00 },  // było 0.95
    ],
    visual: {
        small:  { glow: 12, bloom: 32, sprite: 32, bloomSprite: 80 },
        medium: { glow: 20, bloom: 48, sprite: 44, bloomSprite: 110 },
        large:  { glow: 32, bloom: 70, sprite: 70, bloomSprite: 160 },
    },
};

const QUALITY = {
    high: {
        quality: 'high', drawBloom: true, drawRings: true,
        starsVisible: true, ambientVisible: true,
        maxActivePulses: 10, dprMultiplier: 1.0, targetFPS: 35, startLayer: 0,
    },
    medium: {
        quality: 'medium', drawBloom: false, drawRings: false,
        starsVisible: true, ambientVisible: true,
        maxActivePulses: 6, dprMultiplier: 0.7, targetFPS: 32, startLayer: 0,
    },
    low: {
        quality: 'low', drawBloom: false, drawRings: false,
        starsVisible: true, ambientVisible: true,
        maxActivePulses: 3, dprMultiplier: 0.5, targetFPS: 26, startLayer: 1,
    },
    minimal: {
        quality: 'minimal', drawBloom: false, drawRings: false,
        starsVisible: false, ambientVisible: false,
        maxActivePulses: 2, dprMultiplier: 0.35, targetFPS: 22, startLayer: 2,
    },
};
const Q_ORDER = ['high', 'medium', 'low', 'minimal'];

function createSprite(size, stops) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const cx = size / 2;
    const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
    for (const [pos, color] of stops) g.addColorStop(pos, color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return c;
}

class ComputeNode {
    constructor(x, y, type, layerIndex, scrollThreshold) {
        this.baseX = x; this.baseY = y;
        this.x = x; this.y = y;
        this.drawX = x; this.drawY = y;
        this.type = type;
        this.layerIndex = layerIndex;
        this.scrollThreshold = scrollThreshold;
        this.pulsePhase = Math.random() * 6.283;
        this.pulseSpeed = CONFIG.pulseSpeedRange[0]
            + Math.random() * (CONFIG.pulseSpeedRange[1] - CONFIG.pulseSpeedRange[0]);
        this.driftAngle = Math.random() * 6.283;
        this.driftRadius = 5 + Math.random() * 16;
        this.driftSpeed = (0.03 + Math.random() * 0.06) * CONFIG.driftSpeed;
        this.hasRing = type === 'large' || (type === 'medium' && Math.random() > 0.55);
        this.hasDoubleRing = type === 'large' && Math.random() > 0.5;
        this.ringAngle = Math.random() * 6.283;
        this.ringSpeed = 0.12 + Math.random() * 0.25;
        this.connectionCount = 0;
        this.mouseProximity = 0;
        this.opacity = scrollThreshold === 0 ? 1 : 0;
        this.targetOpacity = scrollThreshold === 0 ? 1 : 0;
        this.alive = true; this.fadingIn = false; this.fadingOut = false; this.fadeTimer = 0;
    }
    update(time, dt, scrollProgress) {
        this.x = this.baseX + Math.cos(this.driftAngle + time * this.driftSpeed) * this.driftRadius;
        this.y = this.baseY + Math.sin(this.driftAngle * 1.3 + time * this.driftSpeed * 0.7) * this.driftRadius * 0.6;
        if (this.hasRing) this.ringAngle += this.ringSpeed * dt;
        if (this.scrollThreshold > 0) {
            this.targetOpacity = scrollProgress >= this.scrollThreshold
                ? Math.min((scrollProgress - this.scrollThreshold) * 5, 1) : 0;
        }
        if (this.fadingIn) {
            this.fadeTimer += dt;
            this.targetOpacity = Math.min(this.fadeTimer / CONFIG.autoscaleFadeDuration, 1);
            if (this.targetOpacity >= 1) this.fadingIn = false;
        }
        if (this.fadingOut) {
            this.fadeTimer += dt;
            this.targetOpacity = Math.max(1 - this.fadeTimer / CONFIG.autoscaleFadeDuration, 0);
            if (this.targetOpacity <= 0) this.alive = false;
        }
        this.opacity += (this.targetOpacity - this.opacity) * 0.05;
    }
    pulse(time) { return 0.5 + 0.5 * Math.sin(this.pulsePhase + time * this.pulseSpeed); }
    startFadeOut() { this.fadingOut = true; this.fadeTimer = 0; }
}

class StaticStar {
    constructor(w, h) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.size = 0.4 + Math.random() * 1.0;
        this.brightness = 0.2 + Math.random() * 0.4;
    }
}

class Star {
    constructor(w, h) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.size = 0.5 + Math.random() * 1.8;
        this.brightness = 0.25 + Math.random() * 0.5;
        this.pulsePhase = Math.random() * 6.283;
        this.pulseSpeed = 0.3 + Math.random() * 0.8;
    }
}

class AmbientParticle {
    constructor(w, h) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.15;
        this.vy = -0.05 - Math.random() * 0.15;
        this.size = 0.8 + Math.random() * 2.2;  // trochę większe
        this.opacity = 0.06 + Math.random() * 0.12;  // jaśniejsze
        this.w = w;
        this.h = h;
    }
    update(dt) {
        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;
        if (this.y < -10) {
            this.y = this.h + 10;
            this.x = Math.random() * this.w;
        }
        if (this.x < -10) this.x = this.w + 10;
        if (this.x > this.w + 10) this.x = -10;
    }
}

class Connection {
    constructor(a, b) {
        this.nodeA = a;
        this.nodeB = b;
        this.layer = Math.min(a.layerIndex, b.layerIndex);
        const dx = b.baseX - a.baseX, dy = b.baseY - a.baseY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const bend = (Math.random() - 0.5) * dist * 0.3;
        this.bendX = (-dy / dist) * bend;
        this.bendY = (dx / dist) * bend;
        this._drawCPX = 0;
        this._drawCPY = 0;
    }
}

class DataPulse {
    constructor() {
        this.conn = null;
        this.progress = 0;
        this.speed = 0;
        this.alive = false;
        this.size = 0;
    }
    init(conn) {
        this.conn = conn;
        this.progress = 0;
        this.speed = CONFIG.flowSpeedRange[0]
            + Math.random() * (CONFIG.flowSpeedRange[1] - CONFIG.flowSpeedRange[0]);
        this.alive = true;
        this.size = 3 + Math.random() * 4;
    }
    update(dt) {
        this.progress += this.speed * dt;
        if (this.progress > 1) this.alive = false;
    }
    getPosition() {
        const t = this.progress, o = 1 - t, a = this.conn.nodeA, b = this.conn.nodeB;
        return {
            x: o * o * a.drawX + 2 * o * t * this.conn._drawCPX + t * t * b.drawX,
            y: o * o * a.drawY + 2 * o * t * this.conn._drawCPY + t * t * b.drawY,
        };
    }
}

class QualityManager {
    constructor() {
        this.frameTimes = [];
        this.checkInterval = 0;
        Object.assign(this, QUALITY.high);
    }
    recordFrame(dt) {
        this.frameTimes.push(dt);
        if (this.frameTimes.length > CONFIG.fpsWindow) this.frameTimes.shift();
        if (++this.checkInterval >= 20) {
            this.checkInterval = 0;
            return this._evaluate();
        }
        return false;
    }
    _evaluate() {
        if (this.frameTimes.length < 12) return false;
        const fps = this.frameTimes.length / this.frameTimes.reduce((a, b) => a + b, 0);
        if (fps < CONFIG.fpsLowThreshold) return this._shift(1);
        if (fps > CONFIG.fpsHighThreshold && this.quality !== 'high') return this._shift(-1);
        return false;
    }
    _shift(dir) {
        const idx = Q_ORDER.indexOf(this.quality) + dir;
        if (idx < 0 || idx >= Q_ORDER.length) return false;
        Object.assign(this, QUALITY[Q_ORDER[idx]]);
        this.frameTimes = [];
        return true;
    }
}

class CloudEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.nodes = [];
        this.connections = [];
        this.connectionsByLayer = [[], [], [], []];
        this.nodesByLayer = [[], [], [], []];
        this.stars = [];
        this.staticStars = [];  // ✨ NOWE
        this.ambientParticles = [];
        this.scrollProgress = 0;
        this.mouse = { x: 0, y: 0, sx: 0, sy: 0 };
        this.mouseActive = false;
        this._mSX = 0;
        this._mSY = 0;
        this.isRunning = false;
        this.frameId = null;
        this.lastTime = 0;
        this.starCanvas = document.createElement('canvas');
        this.starCtx = this.starCanvas.getContext('2d');
        this.starFrameCounter = 999;
        this.pulsePool = [];
        for (let i = 0; i < CONFIG.maxPulses; i++) this.pulsePool.push(new DataPulse());
        this.activePulses = [];
        this.quality = new QualityManager();
        this.lastConnectionRebuild = 0;
        this._currentDPR = -1;
        this._buildSprites();
    }

    _buildSprites() {
        const v = CONFIG.visual;
        this.sprites = {
            small: createSprite(v.small.sprite, [
                [0, 'rgba(180,225,255,0.95)'],
                [0.15, 'rgba(12,192,255,0.25)'],
                [1, 'rgba(0,50,120,0)'],
            ]),
            medium: createSprite(v.medium.sprite, [
                [0, 'rgba(210,240,255,1)'],
                [0.12, 'rgba(12,192,255,0.3)'],
                [1, 'rgba(0,50,120,0)'],
            ]),
            large: createSprite(v.large.sprite, [
                [0, 'rgba(235,248,255,1)'],
                [0.1, 'rgba(12,192,255,0.35)'],
                [1, 'rgba(0,50,120,0)'],
            ]),
        };
        this.bloomSprites = {
            small: createSprite(v.small.bloomSprite, [
                [0, 'rgba(12,192,255,0.08)'],
                [0.5, 'rgba(0,60,130,0.01)'],
                [1, 'rgba(0,20,60,0)'],
            ]),
            medium: createSprite(v.medium.bloomSprite, [
                [0, 'rgba(12,192,255,0.12)'],
                [0.4, 'rgba(0,60,130,0.015)'],
                [1, 'rgba(0,20,60,0)'],
            ]),
            large: createSprite(v.large.bloomSprite, [
                [0, 'rgba(12,192,255,0.18)'],
                [0.35, 'rgba(0,70,140,0.02)'],
                [1, 'rgba(0,20,60,0)'],
            ]),
        };
        this.pulseSprite = createSprite(20, [
            [0, 'rgba(220,245,255,1)'],
            [0.25, 'rgba(12,192,255,0.6)'],
            [1, 'rgba(0,50,120,0)'],
        ]);
        const as = CONFIG.mouseAuraRadius * 2;
        this.auraSprite = createSprite(as, [
            [0, 'rgba(12,192,255,0.15)'],
            [0.25, 'rgba(0,120,200,0.04)'],
            [1, 'rgba(0,20,60,0)'],
        ]);
    }

    _renderStarLayer(time) {
        const ctx = this.starCtx;
        ctx.clearRect(0, 0, this.width, this.height);


        ctx.fillStyle = 'rgba(140,200,255,1)';
        for (const s of this.staticStars) {
            ctx.globalAlpha = s.brightness * 0.5;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, 6.283);
            ctx.fill();
        }


        for (const s of this.stars) {
            ctx.globalAlpha = s.brightness
                * (0.6 + 0.4 * Math.sin(s.pulsePhase + time * s.pulseSpeed)) * 0.55;  // było 0.4
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, 6.283);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this._currentDPR = -1;
        this._updateDPR();
        this.starCanvas.width = w;
        this.starCanvas.height = h;
        this._generate();
    }

    _updateDPR() {
        const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDPR)
            * this.quality.dprMultiplier;
        if (Math.abs(dpr - this._currentDPR) < 0.01) return;
        this._currentDPR = dpr;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    _onQualityChange() {
        this._updateDPR();
        this.canvas.parentElement?.setAttribute('data-quality', this.quality.quality);
    }

    _generate() {
        this.nodes = [];
        this.connections = [];
        this.connectionsByLayer = [[], [], [], []];
        this.nodesByLayer = [[], [], [], []];
        this.activePulses = [];
        const m = 80, w = this.width, h = this.height;

        this.stars = [];
        for (let i = 0; i < CONFIG.starCount; i++) this.stars.push(new Star(w, h));

        this.staticStars = [];
        for (let i = 0; i < CONFIG.starCountStatic; i++) this.staticStars.push(new StaticStar(w, h));

        this.ambientParticles = [];
        for (let i = 0; i < CONFIG.ambientParticleCount; i++)
            this.ambientParticles.push(new AmbientParticle(w, h));

        const spawn = (count, type, layers, thr) => {
            for (let i = 0; i < count; i++) {
                const li = layers[Math.floor(Math.random() * layers.length)];
                this.nodes.push(new ComputeNode(
                    m + Math.random() * (w - m * 2),
                    m + Math.random() * (h - m * 2), type, li, thr
                ));
            }
        };
        spawn(CONFIG.nodes.small, 'small', [0, 0, 1, 1, 2, 2, 3], 0);
        spawn(CONFIG.nodes.medium, 'medium', [0, 1, 1, 2, 2, 3], 0);
        spawn(CONFIG.nodes.large, 'large', [1, 2, 2, 3, 3], 0);
        const sn = CONFIG.scrollNodes;
        const smW = Math.ceil(sn.small / 5), mdW = Math.ceil(sn.medium / 4),
            lgW = Math.ceil(sn.large / 3);
        for (let i = 0; i < 5; i++) spawn(smW, 'small', [0, 1, 1, 2, 2, 3], 0.15 + i * 0.17);
        for (let i = 0; i < 4; i++) spawn(mdW, 'medium', [1, 1, 2, 2, 3], 0.2 + i * 0.2);
        for (let i = 0; i < 3; i++) spawn(lgW, 'large', [2, 2, 3, 3], 0.3 + i * 0.25);
        this._rebuildLookups();
    }

    _rebuildLookups() {
        this._buildConnections();
        this.nodesByLayer = [[], [], [], []];
        for (const n of this.nodes) {
            if (n.layerIndex >= 0 && n.layerIndex < 4) this.nodesByLayer[n.layerIndex].push(n);
        }
    }

    _buildConnections() {
        this.connections = [];
        this.connectionsByLayer = [[], [], [], []];
        const maxD = CONFIG.maxConnectionDist, maxC = CONFIG.maxConnectionsPerNode;
        for (const n of this.nodes) n.connectionCount = 0;
        for (let i = 0; i < this.nodes.length; i++) {
            const a = this.nodes[i];
            if (a.connectionCount >= maxC) continue;
            const cands = [];
            for (let j = i + 1; j < this.nodes.length; j++) {
                const b = this.nodes[j];
                if (b.connectionCount >= maxC) continue;
                if (Math.abs(a.layerIndex - b.layerIndex) > 1) continue;
                const dx = a.baseX - b.baseX, dy = a.baseY - b.baseY;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < maxD) cands.push({ node: b, dist: d });
            }
            cands.sort((x, y) => x.dist - y.dist);
            const take = Math.min(cands.length, maxC - a.connectionCount);
            for (let k = 0; k < take; k++) {
                const b = cands[k].node;
                const conn = new Connection(a, b);
                this.connections.push(conn);
                if (conn.layer >= 0 && conn.layer < 4)
                    this.connectionsByLayer[conn.layer].push(conn);
                a.connectionCount++;
                b.connectionCount++;
            }
        }
    }

    _getPulse() {
        for (const p of this.pulsePool) {
            if (!p.alive) return p;
        }
        return null;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this._loop();
    }

    stop() {
        this.isRunning = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    _loop() {
        if (!this.isRunning) return;
        this.frameId = requestAnimationFrame(() => this._loop());
        const now = performance.now();
        const interval = 1000 / this.quality.targetFPS;
        const elapsed = now - this.lastTime;
        if (elapsed < interval) return;
        this.lastTime = now - (elapsed % interval);
        const dt = Math.min(elapsed / 1000, 0.06);
        const time = now / 1000;
        if (this.quality.recordFrame(dt)) this._onQualityChange();
        this._update(time, dt);
        this._draw(time);
    }

    _update(time, dt) {
        this.mouse.sx += (this.mouse.x - this.mouse.sx) * CONFIG.mouseLerp;
        this.mouse.sy += (this.mouse.y - this.mouse.sy) * CONFIG.mouseLerp;

        for (const n of this.nodes) n.update(time, dt, this.scrollProgress);

        if (Math.random() < CONFIG.autoscaleChance && this.nodes.length > 15) {
            const base = this.nodes.filter(
                n => n.scrollThreshold === 0 && !n.fadingOut && !n.fadingIn && n.type === 'small'
            );
            if (base.length > 0)
                base[Math.floor(Math.random() * base.length)].startFadeOut();
        }
        if (Math.random() < CONFIG.autoscaleChance) {
            const m = 80;
            const n = new ComputeNode(
                m + Math.random() * (this.width - m * 2),
                m + Math.random() * (this.height - m * 2),
                'small', [0, 1, 1, 2][Math.floor(Math.random() * 4)], 0
            );
            n.fadingIn = true;
            n.opacity = 0;
            n.fadeTimer = 0;
            this.nodes.push(n);
            if (n.layerIndex >= 0 && n.layerIndex < 4)
                this.nodesByLayer[n.layerIndex].push(n);
        }

        let w = 0;
        for (let i = 0; i < this.nodes.length; i++)
            if (this.nodes[i].alive) this.nodes[w++] = this.nodes[i];
        if (w < this.nodes.length) {
            this.nodes.length = w;
            this.nodesByLayer = [[], [], [], []];
            for (const n of this.nodes)
                if (n.layerIndex >= 0 && n.layerIndex < 4)
                    this.nodesByLayer[n.layerIndex].push(n);
        }

        for (const p of this.ambientParticles) p.update(dt);

        if (this.mouseActive) {
            this._mSX = (this.mouse.sx + 1) * 0.5 * this.width;
            this._mSY = (-this.mouse.sy + 1) * 0.5 * this.height;
            const r = CONFIG.mouseInteractRadius, rSq = r * r, f = CONFIG.mouseRepelForce;
            for (const node of this.nodes) {
                const dx = node.x - this._mSX, dy = node.y - this._mSY;
                const dSq = dx * dx + dy * dy;
                if (dSq < rSq && dSq > 1) {
                    const d = Math.sqrt(dSq), t = 1 - d / r, tt = t * t;
                    node.drawX = node.x + (dx / d) * tt * f;
                    node.drawY = node.y + (dy / d) * tt * f;
                    node.mouseProximity = tt;
                } else {
                    node.drawX = node.x;
                    node.drawY = node.y;
                    node.mouseProximity = 0;
                }
            }
        } else {
            for (const node of this.nodes) {
                node.drawX = node.x;
                node.drawY = node.y;
                node.mouseProximity = 0;
            }
        }

        for (const c of this.connections) {
            if (!c.nodeA.alive || !c.nodeB.alive) continue;
            c._drawCPX = (c.nodeA.drawX + c.nodeB.drawX) * 0.5 + c.bendX;
            c._drawCPY = (c.nodeA.drawY + c.nodeB.drawY) * 0.5 + c.bendY;
        }

        const rate = CONFIG.flowSpawnChance
            * (1 + this.scrollProgress * CONFIG.flowSpawnScrollMultiplier);
        const maxP = this.quality.maxActivePulses;
        if (this.connections.length > 0 && this.activePulses.length < maxP) {
            const expected = rate * this.connections.length;
            let spawns = Math.floor(expected);
            if (Math.random() < (expected - spawns)) spawns++;
            for (let i = 0; i < spawns && this.activePulses.length < maxP; i++) {
                const conn = this.connections[
                    Math.floor(Math.random() * this.connections.length)
                    ];
                if (!conn.nodeA.alive || !conn.nodeB.alive) continue;
                if (conn.nodeA.opacity < 0.1 || conn.nodeB.opacity < 0.1) continue;
                const p = this._getPulse();
                if (p) {
                    p.init(conn);
                    this.activePulses.push(p);
                }
            }
        }

        for (const p of this.activePulses) p.update(dt);
        w = 0;
        for (let i = 0; i < this.activePulses.length; i++)
            if (this.activePulses[i].alive) this.activePulses[w++] = this.activePulses[i];
        this.activePulses.length = w;

        this.lastConnectionRebuild += dt;
        if (this.lastConnectionRebuild > CONFIG.connectionRebuildInterval) {
            this.lastConnectionRebuild = 0;
            this._rebuildLookups();
        }
    }

    _draw(time) {
        const ctx = this.ctx;
        const q = this.quality;
        ctx.clearRect(0, 0, this.width, this.height);
        const scrollBoost = 1 + this.scrollProgress * CONFIG.scrollBrightness;

        if (q.starsVisible) {
            if (++this.starFrameCounter >= CONFIG.starRedrawInterval) {
                this.starFrameCounter = 0;
                this._renderStarLayer(time);
            }
            ctx.globalAlpha = scrollBoost * 1.15;  // ✨ trochę jaśniej
            ctx.drawImage(this.starCanvas, 0, 0);
        }

        if (this.mouseActive) {
            const as = CONFIG.mouseAuraRadius * 2;
            ctx.globalAlpha = CONFIG.mouseAuraOpacity * (1 + this.scrollProgress * 0.5);
            ctx.drawImage(this.auraSprite,
                (this._mSX - as * 0.5) | 0, (this._mSY - as * 0.5) | 0, as, as);
        }

        if (q.ambientVisible) {
            ctx.fillStyle = 'rgba(12,192,255,1)';
            for (const p of this.ambientParticles) {
                ctx.globalAlpha = p.opacity * scrollBoost;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, 6.283);
                ctx.fill();
            }
        }

        for (let L = q.startLayer; L < 4; L++) {
            const br = CONFIG.layers[L].brightness * scrollBoost;
            const conns = this.connectionsByLayer[L];
            const nodes = this.nodesByLayer[L];
            if (!conns.length && !nodes.length) continue;

            if (conns.length) {
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = 'rgba(12,176,240,1)';
                ctx.globalAlpha = CONFIG.connectionBaseOpacity * br * 0.7;
                ctx.beginPath();
                for (const c of conns) {
                    if (Math.min(c.nodeA.opacity, c.nodeB.opacity) < 0.05) continue;
                    ctx.moveTo(c.nodeA.drawX, c.nodeA.drawY);
                    ctx.quadraticCurveTo(c._drawCPX, c._drawCPY,
                        c.nodeB.drawX, c.nodeB.drawY);
                }
                ctx.stroke();
            }

            for (const p of this.activePulses) {
                if (p.conn.layer !== L) continue;
                const pos = p.getPosition();
                const fade = Math.min(p.progress * 4, 1)
                    * Math.min((1 - p.progress) * 4, 1);
                ctx.globalAlpha = fade * br;
                const s = p.size;
                ctx.drawImage(this.pulseSprite,
                    (pos.x - s * 1.5) | 0, (pos.y - s * 1.5) | 0, s * 3, s * 3);
            }

            for (const node of nodes) {
                if (node.opacity < 0.02) continue;
                const int = node.pulse(time);
                const vis = CONFIG.visual[node.type];
                const nA = node.opacity;
                const pBr = 1 + node.mouseProximity * CONFIG.mouseBrightnessBoost;
                const pSz = 1 + node.mouseProximity * CONFIG.mouseSizeBoost;
                const nx = node.drawX, ny = node.drawY;

                if (q.drawBloom) {
                    const bS = vis.bloom * 2 * (0.85 + 0.15 * int) * pSz;
                    ctx.globalAlpha = br * 0.5 * int * nA * pBr;
                    ctx.drawImage(this.bloomSprites[node.type],
                        (nx - bS * 0.5) | 0, (ny - bS * 0.5) | 0, bS | 0, bS | 0);
                }

                const gS = vis.glow * 2 * (0.8 + 0.2 * int) * pSz;
                ctx.globalAlpha = br * (0.65 + 0.35 * int) * nA * pBr;
                ctx.drawImage(this.sprites[node.type],
                    (nx - gS * 0.5) | 0, (ny - gS * 0.5) | 0, gS | 0, gS | 0);

                if (q.drawRings && node.hasRing) {
                    ctx.globalAlpha = br * 0.2 * int * nA * pBr;
                    ctx.strokeStyle = 'rgba(12,192,255,1)';
                    ctx.lineWidth = 0.6;
                    ctx.save();
                    ctx.translate(nx, ny);
                    ctx.rotate(node.ringAngle);
                    ctx.scale(1, 0.32);
                    ctx.beginPath();
                    ctx.arc(0, 0, vis.glow * 0.7 * pSz, 0, 6.283);
                    ctx.stroke();
                    ctx.restore();
                    if (node.hasDoubleRing) {
                        ctx.globalAlpha = br * 0.12 * int * nA * pBr;
                        ctx.save();
                        ctx.translate(nx, ny);
                        ctx.rotate(-node.ringAngle * 0.6);
                        ctx.scale(1, 0.28);
                        ctx.beginPath();
                        ctx.arc(0, 0, vis.glow * 1.05 * pSz, 0, 6.283);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            }
        }
        ctx.globalAlpha = 1;
    }

    setScroll(v) {
        this.scrollProgress = Math.max(0, Math.min(1, v));
    }
    setMouse(x, y) {
        this.mouse.x = x;
        this.mouse.y = y;
        this.mouseActive = true;
    }
    dispose() {
        this.stop();
        this.nodes = [];
        this.connections = [];
        this.connectionsByLayer = [[], [], [], []];
        this.nodesByLayer = [[], [], [], []];
        this.activePulses = [];
        this.stars = [];
        this.staticStars = [];
        this.ambientParticles = [];
    }
}

const CloudBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const engine = new CloudEngine(canvas);
        engine.resize(window.innerWidth, window.innerHeight);

        // Użytkownicy z prefers-reduced-motion: reduce dostają jeden statyczny frame
        // zamiast ciągłej pętli animacji — respektuje ustawienia dostępności OS.
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReduced) {
            const t0 = performance.now() / 1000;
            engine._update(t0, 0);
            engine._draw(t0);
        } else {
            engine.start();
        }

        let resizeTimer;
        const onResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(
                () => engine.resize(window.innerWidth, window.innerHeight), 250
            );
        };

        // requestAnimationFrame zamiast setTimeout(fn, 16):
        // gwarantuje dokładnie jedno odczytanie scrollY na klatkę,
        // synchronizując z cyklem compositing przeglądarki.
        let scrollRaf = null;
        const onScroll = () => {
            if (scrollRaf !== null) return;
            scrollRaf = requestAnimationFrame(() => {
                scrollRaf = null;
                const max = document.documentElement.scrollHeight - window.innerHeight;
                engine.setScroll(max > 0 ? window.scrollY / max : 0);
            });
        };

        let lastMouseTime = 0;
        const onMouse = (e) => {
            const now = performance.now();
            if (now - lastMouseTime < 50) return;
            lastMouseTime = now;
            engine.setMouse(
                (e.clientX / window.innerWidth) * 2 - 1,
                -(e.clientY / window.innerHeight) * 2 + 1
            );
        };

        const onVisibility = () => {
            if (prefersReduced) return;
            document.hidden ? engine.stop() : engine.start();
        };

        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('mousemove', onMouse, { passive: true });
        document.addEventListener('visibilitychange', onVisibility);
        onScroll();

        return () => {
            clearTimeout(resizeTimer);
            if (scrollRaf !== null) cancelAnimationFrame(scrollRaf);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('mousemove', onMouse);
            document.removeEventListener('visibilitychange', onVisibility);
            engine.dispose();
        };
    }, []);

    return (
        <div className="cloud-bg-wrapper" aria-hidden="true">
            <canvas ref={canvasRef} className="cloud-bg-canvas" />
        </div>
    );
};

export default React.memo(CloudBackground);