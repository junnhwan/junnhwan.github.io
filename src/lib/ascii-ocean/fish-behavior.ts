/** Small, bounded steering simulation, independent of the canvas and browser. */
export type FishKind = 'shark' | 'koi' | 'goldfish';
export type FishMood = 'following' | 'returning' | 'resting' | 'startled';
export interface Habitat { x: number; y: number; side: -1 | 1; size: number }
export interface Fish {
  id: number;
  kind: FishKind;
  x: number;
  y: number;
  heading: number;
  turn: number;
  speed: number;
  phase: number;
  length: number;
  curious: boolean;
  mood: FishMood;
  homeX: number;
  homeY: number;
  restHeading: number;
  startledUntil: number;
  escapeHeading: number;
  spine: Float32Array;
}

const TAU = Math.PI * 2;
const NODES = 20;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const angleDelta = (a: number) => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;

export class FishSchool {
  readonly fish: Fish[] = [];
  readonly habitats: Habitat[] = [];
  private width = 0;
  private height = 0;
  private time = 0;
  private pointer = { x: 0, y: 0, movedX: 0, movedY: 0, active: false, movedAt: -Infinity };

  configure(width: number, height: number, colorful = false) {
    this.width = width;
    this.height = height;
    const compact = width < 600;
    const length = Math.min(width * (compact ? .38 : .24), height * .44, 310);
    this.habitats.splice(0, this.habitats.length,
      { x: width * .12, y: height * .77, side: 1, size: length * .44 },
      { x: width * .88, y: height * .75, side: -1, size: length * .39 },
    );
    this.fish.length = 0;
    const count = compact ? 2 : 3;
    for (let id = 0; id < count; id++) {
      const home = this.habitats[id === 0 ? 1 : 0];
      const size = length * (id === 0 ? 1 : id === 1 ? .72 : .43);
      const heading = id === 0 ? -.92 : id === 1 ? .38 : -.35;
      const x = width * (id === 0 ? .85 : id === 1 ? .25 : .17);
      const y = height * (id === 0 ? .4 : id === 1 ? .25 : .7);
      const actor: Fish = {
        id, kind: colorful ? (id === 1 ? 'goldfish' : 'koi') : 'shark', x, y,
        heading, turn: 0, speed: 16, phase: id * 2.4, length: size,
        curious: id === 0 || (id === 1 && !compact), mood: 'returning',
        homeX: home.x + home.side * size * .3 + (id === 2 ? size * .3 : 0),
        homeY: home.y - size * (id === 2 ? 1.3 : .24),
        restHeading: home.side === 1 ? 0 : Math.PI,
        startledUntil: 0, escapeHeading: 0, spine: new Float32Array(NODES * 2),
      };
      for (let i = 0; i < NODES; i++) {
        actor.spine[i * 2] = x - Math.cos(heading) * size * i / (NODES - 1);
        actor.spine[i * 2 + 1] = y - Math.sin(heading) * size * i / (NODES - 1);
      }
      this.fish.push(actor);
    }
  }

  pointAt(x: number, y: number) {
    if (!this.pointer.active || Math.hypot(x - this.pointer.movedX, y - this.pointer.movedY) > .5) {
      this.pointer.movedAt = this.time;
      this.pointer.movedX = x;
      this.pointer.movedY = y;
    }
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.active = true;
  }

  releasePointer() { this.pointer.active = false; }

  startle(x: number, y: number) {
    let nearest: Fish | undefined;
    let distance = 130;
    for (const fish of this.fish) {
      const d = Math.hypot(fish.x - x, fish.y - y);
      if (d < distance) { nearest = fish; distance = d; }
    }
    if (nearest) {
      nearest.startledUntil = this.time + .75;
      nearest.escapeHeading = Math.atan2(nearest.y - y, nearest.x - x);
    }
  }

  /** Keep a curious fish beside the signature when the pointer crosses the text. */
  private pointerGoal(fish: Fish) {
    let x = this.pointer.x + (fish.id === 0 ? -24 : 28);
    let y = this.pointer.y + (fish.id === 0 ? 25 : -30);
    const rx = this.width * .29, ry = this.height * .24;
    const nx = (x - this.width * .5) / rx, ny = (y - this.height * .43) / ry;
    const radius = Math.hypot(nx, ny);
    if (radius < 1) {
      const angle = radius < .05 ? (fish.id === 0 ? .4 : -2.8) : Math.atan2(ny, nx);
      x = this.width * .5 + Math.cos(angle) * rx;
      y = this.height * .43 + Math.sin(angle) * ry;
    }
    return { x: clamp(x, 30, this.width - 30), y: clamp(y, 45, this.height * .82) };
  }

  step(elapsed: number) {
    const dt = clamp(elapsed, 0, 1 / 30);
    this.time += dt;
    const interested = this.pointer.active && this.time - this.pointer.movedAt < 1.8;
    for (const fish of this.fish) {
      const nearPointer = Math.hypot(this.pointer.x - fish.x, this.pointer.y - fish.y) < Math.min(720, this.width * .66);
      const follow = fish.curious && interested && nearPointer;
      let goalX = fish.homeX + Math.sin(this.time * .32 + fish.id) * 7;
      let goalY = fish.homeY + Math.cos(this.time * .27 + fish.id) * 4;
      if (follow) {
        const goal = this.pointerGoal(fish);
        goalX = goal.x;
        goalY = goal.y;
      }
      const dx = goalX - fish.x, dy = goalY - fish.y;
      const distance = Math.hypot(dx, dy);
      fish.mood = follow ? 'following' : distance < 22 ? 'resting' : 'returning';
      let desiredHeading = distance > 7 ? Math.atan2(dy, dx) : fish.restHeading + Math.sin(this.time * .3) * .08;
      let desiredSpeed = Math.min(follow ? 68 : 38, Math.max(0, distance - (follow ? 24 : 4)) * (follow ? .55 : .5));
      if (fish.startledUntil > this.time) {
        fish.mood = 'startled';
        desiredHeading = fish.escapeHeading;
        desiredSpeed = 88;
      }
      // Turn and accelerate continuously; a retargeted pointer never teleports a fish.
      const difference = angleDelta(desiredHeading - fish.heading);
      const turn = clamp(difference * 2.2, -1.35, 1.35);
      fish.turn += (turn - fish.turn) * (1 - Math.exp(-dt * 5));
      fish.heading = angleDelta(fish.heading + fish.turn * dt);
      desiredSpeed *= .3 + .7 * Math.max(0, Math.cos(difference));
      fish.speed += (desiredSpeed - fish.speed) * (1 - Math.exp(-dt * 2.5));
      fish.x = clamp(fish.x + Math.cos(fish.heading) * fish.speed * dt, 16, this.width - 16);
      fish.y = clamp(fish.y + Math.sin(fish.heading) * fish.speed * dt, 30, this.height * .86);
      fish.phase += dt * (1.15 + fish.speed * .045);
      fish.spine[0] = fish.x;
      fish.spine[1] = fish.y;
      const back = fish.heading + Math.PI;
      let previousAngle = back;
      const link = fish.length / (NODES - 1);
      for (let node = 1; node < NODES; node++) {
        const i = node * 2;
        const rawAngle = Math.atan2(fish.spine[i + 1] - fish.spine[i - 1], fish.spine[i] - fish.spine[i - 2]);
        const bend = .055 + node / (NODES - 1) * .045;
        const candidate = previousAngle + clamp(angleDelta(rawAngle - previousAngle), -bend, bend);
        const arc = .15 + node * .05;
        // The chest stays broad and the tail bends behind it, without coiling up.
        const angle = back + clamp(angleDelta(candidate - back), -arc, arc);
        fish.spine[i] = fish.spine[i - 2] + Math.cos(angle) * link;
        fish.spine[i + 1] = fish.spine[i - 1] + Math.sin(angle) * link;
        previousAngle = angle;
      }
    }
  }
}
