/**
 * A bespoke, procedural tide for junnhwan's home page.
 * Character fish, woven fins and typographic points share one flow field.
 * Fish profile attribution is recorded in fish-art.ts and /third-party/.
 */
import { FishSchool } from './fish-behavior';
import { CharacterFishRenderer } from './fish-art';

export type OceanKind = 'sharks' | 'rays' | 'koi' | 'shoal';
type Point = { x: number; y: number };
type Pose = Point & { size: number; angle: number; phase: number; depth: number };
type Ripple = Point & { born: number };
type MeshPoint = { u: number; v: number; seed: number };

const TAU = Math.PI * 2;
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const hash = (x: number) => {
  const n = Math.sin(x * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const rgb = (color: number[], alpha = 1) => `rgba(${color.join(',')},${alpha})`;

export class TidalScene {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private time = 9;
  private light = false;
  private kind: OceanKind = 'sharks';
  private school = new FishSchool();
  private fishArt = new CharacterFishRenderer();
  private fishClarity = (x: number, y: number) => this.clarity(x, y);
  private ink = [102, 187, 184];
  private bright = [180, 238, 225];
  private dim = [52, 114, 126];
  private inkStyle = '';
  private brightStyle = '';
  private dimStyle = '';
  private mesh: MeshPoint[] = [];
  private ripples: Ripple[] = [];
  private glow: HTMLCanvasElement;
  private pointer = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, strength: 0, active: false };

  constructor(private canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Canvas 2D is unavailable');
    this.ctx = context;
    this.glow = document.createElement('canvas');
    this.glow.width = this.glow.height = 48;
    for (let row = 0; row <= 44; row++) {
      for (let col = 0; col <= 18; col++) {
        this.mesh.push({ u: col / 9 - 1, v: row / 22 - 1, seed: hash(row * 29 + col) });
      }
    }
    this.setPalette(false);
  }

  setPalette(light: boolean, kind: OceanKind = this.kind) {
    const changed = kind !== this.kind;
    this.light = light;
    this.kind = kind;
    this.fishArt.setPalette(light);
    if (changed && this.width && this.height) this.school.configure(this.width, this.height, kind === 'koi');
    if (kind === 'koi') {
      this.ink = light ? [158, 105, 46] : [206, 165, 106];
      this.bright = light ? [129, 77, 33] : [255, 225, 171];
      this.dim = light ? [176, 143, 93] : [132, 106, 83];
    } else {
      this.ink = light ? [34, 118, 118] : [102, 187, 184];
      this.bright = light ? [24, 88, 98] : [180, 238, 225];
      this.dim = light ? [96, 147, 147] : [52, 114, 126];
    }
    this.inkStyle = rgb(this.ink);
    this.brightStyle = rgb(this.bright);
    this.dimStyle = rgb(this.dim);
    const ctx = this.glow.getContext('2d')!;
    ctx.clearRect(0, 0, 48, 48);
    const halo = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);
    halo.addColorStop(0, rgb(this.bright, .8));
    halo.addColorStop(.12, rgb(this.ink, .32));
    halo.addColorStop(1, rgb(this.ink, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, 48, 48);
  }

  resize(width: number, height: number, dpr: number) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.school.configure(width, height, this.kind === 'koi');
  }

  pointAt(x: number, y: number) {
    const p = this.pointer;
    if (!p.active && p.strength < .01) { p.x = x; p.y = y; p.vx = p.vy = 0; }
    p.tx = x;
    p.ty = y;
    p.active = true;
    this.school.pointAt(x, y);
  }

  releasePointer() { this.pointer.active = false; this.school.releasePointer(); }

  ripple(x: number, y: number) {
    this.ripples.push({ x, y, born: this.time });
    if (this.ripples.length > 4) this.ripples.shift();
    this.school.startle(x, y);
  }

  step(dt: number) {
    this.time += dt;
    this.school.step(dt);
    const p = this.pointer;
    // Mass 1, stiffness 100, damping 10: retargetable physical pointer response.
    p.vx += ((p.tx - p.x) * 100 - p.vx * 10) * dt;
    p.vy += ((p.ty - p.y) * 100 - p.vy * 10) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.strength += ((p.active ? 1 : 0) - p.strength) * (1 - Math.exp(-dt * 5));
    this.ripples = this.ripples.filter(r => this.time - r.born < 2.8);
  }

  /** Protect the signature and the reading edge without putting a box over the art. */
  private clarity(x: number, y: number) {
    const nx = (x - this.width * .5) / (this.width * .27);
    const ny = (y - this.height * .43) / (this.height * .26);
    const quiet = .13 + .87 * clamp((nx * nx + ny * ny - .2) / 1.6);
    const edge = clamp(y / (this.height * .13)) * clamp((this.height - y) / (this.height * .17));
    return quiet * edge;
  }

  private displace(x: number, y: number, strength = 1): Point {
    let dx = 0, dy = 0;
    const p = this.pointer;
    if (p.strength > .005) {
      const ox = x - p.x, oy = y - p.y;
      const d = Math.hypot(ox, oy) || 1;
      const force = Math.exp(-d * d / 24000) * p.strength * 16 * strength;
      dx += (ox - oy * .25) / d * force;
      dy += (oy + ox * .25) / d * force;
    }
    for (const ripple of this.ripples) {
      const age = this.time - ripple.born;
      const ox = x - ripple.x, oy = y - ripple.y;
      const d = Math.hypot(ox, oy) || 1;
      const ring = (d - age * 125) / 32;
      const force = Math.exp(-ring * ring) * Math.sin(ring * 2) * 12 * (1 - age / 2.8) * strength;
      dx += ox / d * force;
      dy += oy / d * force;
    }
    return { x: x + dx, y: y + dy };
  }

  private currentY(u: number, strand: number, layer = 0) {
    const phase = this.time * .045;
    const band = this.height * (.53 + .19 * Math.sin(u * 5.5 + phase + layer * 1.7));
    const spread = (strand - .5) * this.height * (.11 + .13 * Math.sin(u * Math.PI) ** 2);
    return band + spread + Math.sin(u * 13 + strand * 3 - phase) * 6;
  }

  private drawCurrents() {
    const ctx = this.ctx;
    const columns = Math.ceil(this.width / 22);
    ctx.lineWidth = .65;
    for (let layer = 0; layer < 2; layer++) {
      const count = this.width < 600 ? 12 : 19;
      for (let line = 0; line < count; line++) {
        const strand = line / (count - 1);
        ctx.beginPath();
        for (let col = 0; col <= columns; col++) {
          const u = col / columns;
          const p = this.displace(u * this.width, this.currentY(u, strand, layer));
          if (col === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = rgb(this.dim, (this.light ? .14 : .19) * (.3 + .7 * Math.sin(strand * Math.PI)));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawPlankton() {
    const ctx = this.ctx;
    const total = this.width < 600 ? 125 : 235;
    for (let i = 0; i < total; i++) {
      const seed = hash(i + 17);
      const u = (hash(i * 3 + 7) + this.time * (.002 + seed * .003)) % 1;
      const layer = i % 3 === 0 ? 1 : 0;
      const y = this.currentY(u, hash(i * 7 + 9), layer) + (hash(i * 13) - .5) * this.height * .24;
      const p = this.displace(u * this.width, y);
      const glint = .5 + .5 * Math.sin(this.time * .6 + seed * 40);
      ctx.globalAlpha = this.clarity(p.x, p.y) * (.12 + glint * .4);
      ctx.fillStyle = seed > .88 ? this.brightStyle : this.inkStyle;
      const size = seed > .86 ? 1.4 : .75;
      ctx.fillRect(p.x, p.y, size, size);
      if (seed > .93 && !this.light) {
        ctx.globalAlpha *= .7;
        ctx.drawImage(this.glow, p.x - 8, p.y - 8, 16, 16);
      }
    }
    // A sparse, slower layer gives the moving currents a sense of distance.
    ctx.fillStyle = this.dimStyle;
    for (let i = 0; i < 65; i++) {
      const x = hash(i * 19 + 2) * this.width;
      const y = (hash(i * 23 + 1) * this.height - this.time * (1 + hash(i) * 2) + this.height * 10) % this.height;
      ctx.globalAlpha = this.clarity(x, y) * .25;
      ctx.fillRect(x, y, .7, .7);
    }
    ctx.globalAlpha = 1;
  }

  private drawHabitats() {
    const ctx = this.ctx;
    for (const home of this.school.habitats) {
      const size = home.size;
      // Low rock contours anchor the scene; fine stems move with the same tide.
      ctx.strokeStyle = this.dimStyle;
      ctx.lineWidth = .75;
      for (let contour = 0; contour < 4; contour++) {
        ctx.beginPath();
        for (let i = 0; i <= 38; i++) {
          const u = i / 38;
          const x = home.x + (u - .5) * size * (1.05 - contour * .12);
          const ridge = Math.sin(u * Math.PI) * (.17 + .055 * Math.sin(u * 10 + contour * .65));
          const y = home.y - ridge * size + contour * size * .035;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = this.light ? .4 : .6 - contour * .09;
        ctx.stroke();
      }
      for (let stem = 0; stem < 7; stem++) {
        const seed = hash(stem * 7 + home.side * 31);
        const baseX = home.x + home.side * size * (.17 + stem * .045);
        const height = size * (.32 + seed * .5);
        const phase = this.time * .65 + stem * .8;
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) {
          const u = i / 24;
          const x = baseX + (Math.sin(phase - u * 2.6) * 9 + home.side * 8) * u ** 1.5;
          const y = home.y - height * u;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = this.light ? .43 : .49;
        ctx.strokeStyle = this.inkStyle;
        ctx.lineWidth = stem % 2 ? .7 : 1;
        ctx.stroke();
        for (let leaf = 1; leaf < 4; leaf++) {
          const u = leaf / 4;
          const x = baseX + (Math.sin(phase - u * 2.6) * 9 + home.side * 8) * u ** 1.5;
          const y = home.y - height * u;
          const side = leaf % 2 ? -1 : 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + side * 8, y - 3, x + side * 9, y - 12);
          ctx.stroke();
        }
      }
      ctx.font = '8px "JetBrains Mono Variable", monospace';
      ctx.fillStyle = this.inkStyle;
      ctx.globalAlpha = .36;
      for (let i = 0; i < 32; i++) {
        const u = hash(i * 5 + home.side * 17);
        const x = home.x + (u - .5) * size * .9;
        const y = home.y - Math.sin(u * Math.PI) * size * .12 + hash(i + 8) * size * .07;
        ctx.fillText(i % 4 ? '·' : ':', x, y);
      }
    }
    ctx.globalAlpha = 1;
  }

  private poses(): Pose[] {
    const w = this.width, h = this.height, t = this.time;
    const mobile = w < 600;
    const size = Math.min(w * (mobile ? .34 : .18), h * .38, 270);
    return [
      {
        x: w * ((mobile ? .81 : .79) + .025 * Math.sin(t * .07)),
        y: h * (.49 + .055 * Math.sin(t * .09 + 1.5)),
        size,
        angle: -.64 + .12 * Math.sin(t * .1),
        phase: 0,
        depth: 1,
      },
      {
        x: w * (.16 + .035 * Math.sin(t * .055 + 2)),
        y: h * ((mobile ? .2 : .28) + .05 * Math.sin(t * .08)),
        size: size * .57,
        angle: .43 + .16 * Math.sin(t * .08 + 1),
        phase: 2.8,
        depth: .68,
      },
    ];
  }

  private transform(x: number, y: number, pose: Pose, strength = .3): Point {
    const c = Math.cos(pose.angle), s = Math.sin(pose.angle);
    return this.displace(pose.x + (x * c - y * s) * pose.size, pose.y + (x * s + y * c) * pose.size, strength);
  }

  private rayPoint(u: number, v: number, pose: Pose): Point {
    const wing = Math.abs(v);
    const phase = this.time * 1.05 + pose.phase;
    const chord = .38 * Math.sqrt(1 - wing) + .012;
    const fold = Math.sin(phase - wing * 2.4 + u * .35);
    const x = .055 - .45 * wing ** 1.4 + u * chord + Math.sin(phase - wing * 2) * wing ** 2 * .055;
    const y = v * .87 * (.88 + .12 * fold);
    return this.transform(x, y, pose);
  }

  private drawRay(pose: Pose) {
    const ctx = this.ctx;
    const phase = this.time * 1.05 + pose.phase;
    const glyphs = ['·', ':', '+', 'h', 'w', 'a', 'n'];
    ctx.font = `400 ${clamp(pose.size / 29, 5, 8)}px "JetBrains Mono Variable", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const point of this.mesh) {
      const { u, v, seed } = point;
      const p = this.rayPoint(u, v, pose);
      const edge = Math.abs(u);
      const shine = Math.pow(.5 + .5 * Math.sin(phase * .55 - v * 2 + seed * 6), 8);
      const alpha = (.32 + .42 * edge + .2 * shine) * pose.depth * this.clarity(p.x, p.y);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = seed > .83 ? this.brightStyle : this.inkStyle;
      if (seed > .875 && edge < .94 && pose.size > 80) {
        ctx.fillText(glyphs[Math.floor(seed * 139) % glyphs.length], p.x, p.y);
      } else {
        const size = seed > .78 ? 1.35 : .85;
        ctx.fillRect(p.x, p.y, size, size);
      }
      if (shine > .82 && seed > .91 && !this.light) {
        ctx.globalAlpha = alpha * .65;
        ctx.drawImage(this.glow, p.x - 7, p.y - 7, 14, 14);
      }
    }
    // Cross-grain follows the fins: a moving textile rather than a pixel sprite.
    for (let rib = 0; rib <= 8; rib++) {
      const u = rib / 4 - 1;
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const p = this.rayPoint(u, i / 24 - 1, pose);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      if (rib === 8) {
        ctx.globalAlpha = pose.depth * .09;
        ctx.strokeStyle = this.brightStyle;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.globalAlpha = pose.depth * (rib === 0 || rib === 8 ? .74 : .19);
      ctx.strokeStyle = rib === 8 ? this.brightStyle : this.inkStyle;
      ctx.lineWidth = rib === 8 ? .8 : .6;
      ctx.stroke();
    }
    // A fine, live tail completes the silhouette and trails into the water.
    for (let strand = 0; strand < 3; strand++) {
      ctx.beginPath();
      for (let i = 0; i <= 45; i++) {
        const s = i / 45;
        const x = -.32 - s * 1.36;
        const y = Math.sin(phase - s * 3.4) * s ** 1.6 * .15 + (strand - 1) * .01 * (1 - s);
        const p = this.transform(x, y, pose);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.globalAlpha = pose.depth * (strand === 1 ? .44 : .1);
      ctx.strokeStyle = this.inkStyle;
      ctx.lineWidth = strand === 1 ? .8 : .5;
      ctx.stroke();
    }
    // Paired cephalic fins are a small anatomical cue at the head.
    for (const side of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) {
        const a = i / 16 * Math.PI;
        const p = this.transform(.34 + Math.sin(a) * .15, side * (.045 + (1 - Math.cos(a)) * .04), pose);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.globalAlpha = pose.depth * .65;
      ctx.strokeStyle = this.brightStyle;
      ctx.lineWidth = .8;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawShoal(large = false) {
    const ctx = this.ctx;
    const count = large ? (this.width < 600 ? 68 : 115) : (this.width < 600 ? 16 : 28);
    for (let i = 0; i < count; i++) {
      const seed = hash(i * 41 + 8);
      const u = (hash(i * 11 + 1) + this.time * .006) % 1;
      const strand = hash(i * 29 + 4);
      const y = this.currentY(u, strand, i % 2) + (strand - .5) * this.height * .12;
      const p = this.displace(u * this.width, y);
      const next = this.currentY(u + .002, strand, i % 2);
      const angle = Math.atan2(next - this.currentY(u, strand, i % 2), this.width * .002);
      const size = (large ? 4 : 2.5) + seed * 3.5;
      const c = Math.cos(angle), s = Math.sin(angle);
      ctx.globalAlpha = this.clarity(p.x, p.y) * (.18 + seed * .4);
      ctx.strokeStyle = this.inkStyle;
      ctx.lineWidth = .8;
      ctx.beginPath();
      ctx.moveTo(p.x + c * size, p.y + s * size);
      ctx.quadraticCurveTo(p.x - s * size * .35, p.y + c * size * .35, p.x - c * size * .6, p.y - s * size * .6);
      ctx.lineTo(p.x - c * size - s * size * .28, p.y - s * size + c * size * .28);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawRipples() {
    const ctx = this.ctx;
    for (const ripple of this.ripples) {
      const age = this.time - ripple.born;
      const progress = clamp(age / 2.8);
      if (age < .2) {
        ctx.globalAlpha = (1 - age / .2) * .65;
        ctx.drawImage(this.glow, ripple.x - 13, ripple.y - 13, 26, 26);
      }
      for (let ring = 0; ring < 3; ring++) {
        const radius = age * 125 - ring * 19;
        if (radius <= 0) continue;
        ctx.globalAlpha = (1 - progress) ** 2 * (ring === 0 ? .5 : .18);
        ctx.strokeStyle = this.inkStyle;
        ctx.lineWidth = ring === 0 ? .85 : .5;
        ctx.beginPath();
        ctx.ellipse(ripple.x, ripple.y, radius, radius * .64, -.22, 0, TAU);
        ctx.stroke();
      }
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * TAU + hash(i) * .2;
        const r = age * (25 + hash(i * 7) * 55);
        const x = ripple.x + Math.cos(a) * r;
        const y = ripple.y + Math.sin(a) * r * .64;
        ctx.globalAlpha = (1 - progress) ** 3 * .8;
        ctx.fillStyle = this.brightStyle;
        ctx.fillRect(x, y, 1.2, 1.2);
        if (i % 3 === 0 && !this.light) ctx.drawImage(this.glow, x - 10, y - 10, 20, 20);
      }
    }
    ctx.globalAlpha = 1;
  }

  render() {
    if (!this.width || !this.height) return;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawCurrents();
    this.drawPlankton();
    this.drawHabitats();
    this.drawShoal(this.kind === 'shoal');
    if (this.kind === 'sharks' || this.kind === 'koi') {
      for (const fish of this.school.fish.slice().reverse()) this.fishArt.draw(ctx, fish, this.fishClarity);
    } else if (this.kind === 'rays') {
      for (const pose of this.poses().reverse()) {
        this.drawRay(pose);
      }
    }
    this.drawRipples();
  }
}
