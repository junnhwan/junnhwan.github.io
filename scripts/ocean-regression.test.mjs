import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function sourceModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const { FrameClock } = await sourceModule('../src/lib/ascii-ocean/frame-clock.ts');
const { FishSchool } = await sourceModule('../src/lib/ascii-ocean/fish-behavior.ts');

function cadence(refreshRate, count = refreshRate * 2) {
  const clock = new FrameClock();
  const draws = [];
  for (let i = 0; i < count; i++) {
    const now = 1000 + i * 1000 / refreshRate;
    if (clock.advance(now).draw) draws.push(now);
  }
  return draws;
}

test('60 Hz input renders at 60 fps without losing floating-point frame boundaries', () => {
  const draws = cadence(60);
  assert.ok(draws.length >= 118, `Only ${draws.length} of 120 display frames were drawn`);
  const gaps = draws.slice(1).map((time, i) => time - draws[i]);
  assert.ok(Math.max(...gaps) < 18, `Visible frame gap reached ${Math.max(...gaps).toFixed(1)} ms`);
});

test('50 Hz displays render each available frame; 120 Hz displays stay capped near 60', () => {
  assert.ok(cadence(50).length >= 98, '50 Hz timing skipped available frames');
  const fast = cadence(120).length;
  assert.ok(fast >= 118 && fast <= 122, `High-refresh display drew ${fast} frames instead of about 120`);
});

test('a suspended tab cannot produce an unbounded physics catch-up', () => {
  const clock = new FrameClock();
  clock.advance(1000);
  const resumed = clock.advance(11000);
  assert.ok(resumed.steps <= 5);
  assert.ok(clock.advance(11000 + 1000 / 60).steps <= 2);
  clock.reset();
  assert.equal(clock.advance(20000).steps, 0);
});

test('curious fish approach a moving pointer gradually while resident fish keep their own course', () => {
  const school = new FishSchool();
  const control = new FishSchool();
  school.configure(1200, 650);
  control.configure(1200, 650);
  const follower = school.fish[0];
  const initialDistance = Math.hypot(follower.x - 930, follower.y - 145);
  for (let i = 0; i < 360; i++) {
    const previous = { x: follower.x, y: follower.y, heading: follower.heading };
    school.pointAt(950 + Math.sin(i / 35) * 10, 120 + Math.cos(i / 40) * 8);
    school.step(1 / 60);
    control.step(1 / 60);
    assert.ok(Math.hypot(follower.x - previous.x, follower.y - previous.y) < 1.5, 'Fish teleported to the cursor');
  }
  assert.equal(follower.mood, 'following');
  assert.ok(Math.hypot(follower.x - 930, follower.y - 145) < initialDistance * .7);
  assert.equal(school.fish[2].curious, false);
  assert.equal(school.fish[2].x, control.fish[2].x);
  assert.equal(school.fish[2].y, control.fish[2].y);
});

test('a stationary cursor loses attention; fish return to their habitat and still move their fins', () => {
  const school = new FishSchool();
  school.configure(1200, 650, true);
  school.pointAt(1020, 110);
  for (let i = 0; i < 120; i++) {
    school.pointAt(1020 - i * .4, 110);
    school.step(1 / 60);
  }
  // Leave the cursor inside the hero, but stop moving it.
  for (let i = 0; i < 60 * 45; i++) school.step(1 / 60);
  for (const fish of school.fish) {
    assert.equal(fish.mood, 'resting');
    assert.ok(Math.hypot(fish.x - fish.homeX, fish.y - fish.homeY) < 26, 'Fish did not return beside its habitat');
    const phase = fish.phase;
    school.step(1 / 60);
    assert.ok(fish.phase > phase, 'A resting fish lost its breathing / fin motion');
  }
});

test('click response and large elapsed steps cannot break the fish speed or spine constraints', () => {
  const school = new FishSchool();
  school.configure(1200, 650);
  const fish = school.fish[0];
  const initial = { x: fish.x, y: fish.y };
  school.startle(fish.x + 10, fish.y);
  school.step(10);
  assert.equal(fish.mood, 'startled');
  assert.ok(Math.hypot(fish.x - initial.x, fish.y - initial.y) < 3);
  for (let i = 2; i < fish.spine.length; i += 2) {
    const link = Math.hypot(fish.spine[i] - fish.spine[i - 2], fish.spine[i + 1] - fish.spine[i - 1]);
    assert.ok(Math.abs(link - fish.length / 19) < .001, 'A spine segment stretched');
  }
});
