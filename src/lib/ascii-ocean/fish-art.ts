import type { Fish, FishKind } from './fish-behavior';

/**
 * Body profiles, fin proportions and glyph vocabulary adapted from ASCII Ocean
 * (GqqQq-Q, MIT). See /third-party/ocean-inspiration.txt. Mesh projection, atlas
 * rendering and the blog's habitat / following simulation are local additions.
 */
type Fin = readonly [number, number, number, number];
type Cell = { s: number; v: number; shade: number; glyph: string; patch: boolean; fin: boolean };
const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const random = (n: number) => { const h = Math.sin(n * 127.1 + 311.7) * 43758.5453; return h - Math.floor(h); };

const shapes = {
  shark: {
    halfWidth(s: number) {
      if (s < .13) return .09 * Math.sin(s / .13 * Math.PI / 2) ** .95;
      if (s < .3) return .09 + .016 * smooth(.13, .3, s);
      if (s < .84) return .019 + .087 * (1 - (s - .3) / .54) ** 1.25;
      const k = (s - .84) / .16;
      return .019 * (1 - k) + .012 * Math.sin(k * Math.PI);
    },
    pectoral: [.15, .43, .55, .26] as Fin, pelvic: [.57, .65, .69, .085] as Fin,
    tail: [.86, .95, 1, .085] as Fin, falcate: true, dorsal: [.33, .47], eye: [.1, .14],
    body: [':', ';', 't', '%', 'S', 'X', '8', '#', '@'], fin: ['%', ';', 't', 'S', ':'], ridge: ['@', '8', '%'],
  },
  koi: {
    halfWidth(s: number) {
      if (s < .2) return .022 + .088 * smooth(0, .2, s);
      if (s < .44) return .11 + .012 * smooth(.2, .44, s);
      if (s < .8) return .02 + .102 * (1 - (s - .44) / .36) ** .95;
      const k = (s - .8) / .2;
      return .032 * (1 - k) + .008 * Math.sin(k * Math.PI);
    },
    pectoral: [.2, .38, .52, .32] as Fin, pelvic: [.54, .62, .7, .13] as Fin,
    tail: [.78, 1.04, .92, .26] as Fin, falcate: true, dorsal: [.24, .48], eye: [.07, .11],
    body: ['鲤', '鱼', '鲫', '鲢', '鳙', '鲷', '鳞'], fin: ['鳍', '尾', '游', '波', '鳞'], ridge: ['锦', '鳞', '金'],
  },
  goldfish: {
    halfWidth(s: number) {
      if (s < .26) return .028 + .105 * smooth(0, .26, s) ** .75;
      if (s < .52) return .133 + .016 * Math.sin((s - .26) / .26 * Math.PI);
      if (s < .82) return .022 + .112 * (1 - (s - .52) / .3) ** .85;
      const k = (s - .82) / .18;
      return .04 * (1 - k) + .01 * Math.sin(k * Math.PI);
    },
    pectoral: [.22, .42, .56, .34] as Fin, pelvic: [.56, .66, .74, .14] as Fin,
    tail: [.74, 1.1, .9, .34] as Fin, falcate: false, dorsal: [.22, .46], eye: [.09, .14],
    body: ['金', '鱼', '鲫', '鲤', '鳞', '锦', '鲱'], fin: ['鳍', '尾', '游', '波', '鳞'], ridge: ['锦', '鳞', '金'],
  },
};

function triangle(s: number, v: number, fin: Fin) {
  const [a, b, c, reach] = fin;
  const d1 = (s - b) * 0 - (a - b) * v;
  const d2 = (s - c) * -reach - (b - c) * (v - reach);
  const d3 = (s - a) * reach - (c - a) * v;
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

function mesh(kind: FishKind): Cell[] {
  const shape = shapes[kind];
  const cells: Cell[] = [];
  for (let row = 1; row <= 49; row++) {
    const s = row * .022;
    for (let col = -12; col <= 12; col++) {
      const v = col * .028, a = Math.abs(v), seed = random(row * 53 + col);
      const width = s <= 1 ? shape.halfWidth(s) : 0;
      const across = a / (width || .001);
      const body = s <= 1 && a <= width;
      let fin = false;
      if (!body) {
        const p = shape.pectoral;
        const inPectoral = triangle(s, a, p) && !(shape.falcate
          && s > p[1] && a < (s - p[1]) / (p[2] - p[1]) * p[3] * .7);
        fin = inPectoral || triangle(s, a, shape.pelvic) || triangle(s, a, shape.tail);
        if (!fin) continue;
      }
      let shade = fin ? .38 : clamp(.9 - across * across * .52 - v * 1.4);
      let glyphs = fin ? shape.fin : shape.body;
      if (body && s > shape.dorsal[0] && s < shape.dorsal[1] && across < .3) {
        shade = 1;
        glyphs = shape.ridge;
      }
      const eye = body && s > shape.eye[0] && s < shape.eye[1] && across > .55;
      const patch = kind !== 'shark' && body && Math.sin(s * 22 + v * 31) + Math.cos(v * 49 - s * 8) > .75;
      if (kind === 'shark' && s > .19 && s < .29 && across > .58 && row % 2 === 0) shade *= .5;
      // Even rows keep the outline, eye and dorsal ridge. Interior fill is the
      // expensive part of a resting fish and reads as noise once the silhouette holds.
      const ridge = glyphs === shape.ridge;
      const edge = body && across > .62;
      if (row % 2 === 0 && !eye && !ridge && !edge) continue;
      cells.push({ s, v, shade, glyph: eye ? (kind === 'shark' ? 'o' : '目')
        : glyphs[fin || kind !== 'shark' ? Math.floor(seed * glyphs.length) : Math.floor(shade * (glyphs.length - 1))], patch, fin });
    }
  }
  return cells;
}

/** Rasterize each glyph once, then project the cached character cells onto a live spine. */
export class CharacterFishRenderer {
  private meshes = { shark: mesh('shark'), koi: mesh('koi'), goldfish: mesh('goldfish') };
  private atlas = document.createElement('canvas');
  private glyphs = [...new Set(Object.values(this.meshes).flatMap(cells => cells.map(cell => cell.glyph)))];
  private glyphIndex = new Map(this.glyphs.map((glyph, i) => [glyph, i]));
  private projected = new Float32Array(40);
  private normals = new Float32Array(40);

  constructor() { this.setPalette(false); }

  setPalette(light: boolean) {
    const cell = 28;
    this.atlas.width = this.glyphs.length * cell;
    this.atlas.height = 4 * 6 * cell;
    const ctx = this.atlas.getContext('2d')!;
    ctx.font = '500 19px "JetBrains Mono Variable", "Microsoft YaHei", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const palettes = light
      ? [[40, 89, 105], [173, 73, 47], [157, 106, 28], [96, 119, 110]]
      : [[170, 211, 217], [229, 140, 109], [230, 191, 112], [222, 227, 206]];
    for (let kind = 0; kind < 4; kind++) {
      for (let shade = 0; shade < 6; shade++) {
        const c = palettes[kind].map(value => Math.round(light ? value + (5 - shade) * 5 : value * (.53 + shade * .094)));
        ctx.fillStyle = `rgb(${c.join(',')})`;
        this.glyphs.forEach((glyph, i) => ctx.fillText(glyph, (i + .5) * cell, (kind * 6 + shade + .5) * cell));
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, fish: Fish, clarity: (x: number, y: number) => number) {
    const spine = fish.spine;
    const last = spine.length / 2 - 1;
    for (let node = 0; node <= last; node++) {
      const a = Math.max(0, node - 1) * 2, b = Math.min(last, node + 1) * 2;
      const dx = spine[b] - spine[a], dy = spine[b + 1] - spine[a + 1];
      const length = Math.hypot(dx, dy) || 1;
      const nx = -dy / length, ny = dx / length;
      const u = node / last;
      const wave = Math.sin(fish.phase - u * 5.2) * fish.length * (.003 + u ** 2 * .035) * (.5 + fish.speed / 90);
      this.projected[node * 2] = spine[node * 2] + nx * wave;
      this.projected[node * 2 + 1] = spine[node * 2 + 1] + ny * wave;
      this.normals[node * 2] = nx;
      this.normals[node * 2 + 1] = ny;
    }
    const kind = fish.kind === 'shark' ? 0 : fish.kind === 'koi' ? 1 : 2;
    const glyphSize = Math.max(6, Math.min(10.5, fish.length * (kind === 0 ? .026 : .031)));
    // Source cells include a gutter, so glyph edges remain clean at fractional positions.
    const destination = glyphSize * 28 / 19;
    const finBreath = 1 + Math.sin(fish.phase * .7) * .075;
    for (const cell of this.meshes[fish.kind]) {
      const position = Math.min(last - .001, cell.s * last);
      const i = Math.floor(position) * 2, t = position % 1;
      const nx = this.normals[i] * (1 - t) + this.normals[i + 2] * t;
      const ny = this.normals[i + 1] * (1 - t) + this.normals[i + 3] * t;
      const v = cell.v * fish.length * (cell.fin ? finBreath * (1 + Math.sign(cell.v) * fish.turn * .09) : 1);
      const tail = Math.max(0, cell.s - 1) * fish.length;
      const x = this.projected[i] * (1 - t) + this.projected[i + 2] * t + nx * v + ny * tail;
      const y = this.projected[i + 1] * (1 - t) + this.projected[i + 3] * t + ny * v - nx * tail;
      const alpha = clarity(x, y) * (cell.fin ? .77 : .93) * (fish.id === 2 ? .7 : 1);
      if (alpha < .035) continue;
      ctx.globalAlpha = alpha;
      const shade = Math.round(cell.shade * 5);
      const palette = cell.patch ? 3 : kind;
      const index = this.glyphIndex.get(cell.glyph)!;
      ctx.drawImage(this.atlas, index * 28, (palette * 6 + shade) * 28, 28, 28,
        x - destination / 2, y - destination / 2, destination, destination);
    }
    ctx.globalAlpha = 1;
  }
}
