import { TidalScene, type OceanKind } from './scene';
import { FrameClock } from './frame-clock';

const STORAGE_KEY = 'junnhwan/tidal-ocean/v3';
const SPECIES: readonly OceanKind[] = ['sharks', 'koi', 'rays', 'shoal'];
type Species = OceanKind;
interface Preferences {
  species: Species;
  opacity: number;
  paused: boolean;
}

function readPreferences(): Preferences {
  const defaults: Preferences = { species: 'sharks', opacity: 85, paused: false };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return defaults;
    return {
      species: SPECIES.includes(saved.species) ? saved.species : defaults.species,
      opacity: typeof saved.opacity === 'number' && Number.isFinite(saved.opacity)
        ? Math.max(20, Math.min(100, saved.opacity)) : defaults.opacity,
      paused: typeof saved.paused === 'boolean' ? saved.paused : defaults.paused,
    };
  } catch {
    return defaults;
  }
}

/** Mount one decorative ocean. All listeners and observers belong to this page. */
export function mountAsciiOcean(root: HTMLElement) {
  if (root.dataset.oceanMounted === 'true') return;
  const host = root.closest<HTMLElement>('[data-ocean-hero]');
  const canvas = root.querySelector<HTMLCanvasElement>('canvas');
  const controls = root.querySelector<HTMLDetailsElement>('details');
  const species = root.querySelector<HTMLSelectElement>('[data-ocean-species]');
  const opacity = root.querySelector<HTMLInputElement>('[data-ocean-opacity]');
  const output = root.querySelector<HTMLOutputElement>('output');
  const pause = root.querySelector<HTMLButtonElement>('[data-ocean-pause]');
  const pauseLabel = root.querySelector<HTMLElement>('[data-ocean-pause-label]');
  if (!host || !canvas || !controls || !species || !opacity || !output || !pause || !pauseLabel) return;
  if (!canvas.getContext('2d')) return;

  const preferences = readPreferences();
  const scene = new TidalScene(canvas);
  root.dataset.oceanMounted = 'true';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const events = new AbortController();
  const { signal } = events;
  const STEP = 1 / 60;
  const clock = new FrameClock();
  // Adaptive quality: devices that miss the frame budget step down the scene's
  // resolution and density; comfortable devices step back up. Never persisted.
  const DEGRADE_COST_MS = 7;
  const RECOVER_COST_MS = 3.5;
  const DEGRADE_FRAMES = 45;
  const RECOVER_FRAMES = 400;
  let qualityLevel = 0;
  let costEma = 0;
  let overFrames = 0;
  let underFrames = 0;
  let graceFrames = 90;
  let width = 0;
  let height = 0;
  let frame = 0;
  let visible = false;
  let disposed = false;

  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); }
    catch { /* Preferences still work when browser storage is unavailable. */ }
  };
  const canAnimate = () => !disposed && visible && !document.hidden && !reduced.matches && !preferences.paused;
  const draw = () => scene.render();
  const updateControls = () => {
    species.value = preferences.species;
    opacity.value = String(preferences.opacity);
    output.value = `${preferences.opacity}%`;
    root.style.setProperty('--ocean-opacity', String(preferences.opacity / 100));
    root.dataset.scene = preferences.species;
    pause.disabled = reduced.matches;
    pause.setAttribute('aria-pressed', String(preferences.paused || reduced.matches));
    pauseLabel.textContent = reduced.matches ? '已跟随系统减少动态' : preferences.paused ? '继续游动' : '暂停游动';
    root.dataset.motion = reduced.matches ? 'reduced' : preferences.paused ? 'paused' : canAnimate() ? 'playing' : 'idle';
  };

  function watchQuality(cost: number) {
    if (graceFrames > 0) { graceFrames--; return; }
    costEma = costEma === 0 ? cost : costEma * .9 + cost * .1;
    if (costEma > DEGRADE_COST_MS) {
      overFrames++;
      underFrames = 0;
    } else if (costEma < RECOVER_COST_MS) {
      underFrames++;
      overFrames = 0;
    } else {
      overFrames = 0;
      underFrames = 0;
    }
    if (overFrames >= DEGRADE_FRAMES && qualityLevel < 3) {
      qualityLevel++;
      applyQuality();
    } else if (underFrames >= RECOVER_FRAMES && qualityLevel > 0) {
      qualityLevel--;
      applyQuality();
    }
  }

  function applyQuality() {
    overFrames = 0;
    underFrames = 0;
    costEma = 0;
    graceFrames = 120;
    scene.setQuality(qualityLevel);
    draw();
  }

  function tick(now: number) {
    frame = 0;
    if (!canAnimate()) return;
    const plan = clock.advance(now, scene.paintInterval());
    for (let i = 0; i < plan.steps; i++) scene.step(STEP);
    if (plan.draw) {
      const started = performance.now();
      draw();
      watchQuality(performance.now() - started);
    }
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    clock.reset();
    costEma = 0;
    overFrames = 0;
    underFrames = 0;
    graceFrames = 60;
    scene.releasePointer();
    updateControls();
    if (canAnimate()) frame = requestAnimationFrame(tick);
  }

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const nextWidth = Math.round(rect.width);
    const nextHeight = Math.round(rect.height);
    if (nextWidth < 1 || nextHeight < 1 || (nextWidth === width && nextHeight === height)) return;
    width = nextWidth;
    height = nextHeight;
    scene.resize(width, height, devicePixelRatio || 1);
    draw();
  };

  function updateTheme() {
    const light = !document.documentElement.classList.contains('dark');
    scene.setPalette(light, preferences.species);
    draw();
  }

  const isInteractive = (target: EventTarget | null) => target instanceof Element && !!target.closest(
    'a, button, input, textarea, select, label, details, [contenteditable], [role="button"]',
  );
  host.addEventListener('pointermove', (event) => {
    if (!canAnimate() || !fine.matches || event.pointerType === 'touch' || isInteractive(event.target)) {
      scene.releasePointer();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    scene.pointAt(event.clientX - rect.left, event.clientY - rect.top);
  }, { passive: true, signal });
  host.addEventListener('pointerleave', () => scene.releasePointer(), { signal });
  host.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !canAnimate() || isInteractive(event.target)) return;
    const rect = canvas.getBoundingClientRect();
    scene.ripple(event.clientX - rect.left, event.clientY - rect.top);
    draw();
  }, { passive: true, signal });

  species.addEventListener('change', () => {
    if (!SPECIES.includes(species.value as Species)) return;
    preferences.species = species.value as Species;
    updateTheme();
    sync();
    save();
  }, { signal });
  opacity.addEventListener('input', () => {
    preferences.opacity = Number(opacity.value);
    updateControls();
    save();
  }, { signal });
  pause.addEventListener('click', () => {
    preferences.paused = !preferences.paused;
    sync();
    save();
  }, { signal });
  document.addEventListener('pointerdown', (event) => {
    if (event.target instanceof Node && !controls.contains(event.target)) controls.open = false;
  }, { signal });
  controls.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      controls.open = false;
      controls.querySelector('summary')?.focus();
      event.stopPropagation();
    }
  }, { signal });
  document.addEventListener('visibilitychange', sync, { signal });
  reduced.addEventListener('change', sync, { signal });
  fine.addEventListener('change', () => scene.releasePointer(), { signal });

  const sizeObserver = new ResizeObserver(resize);
  const viewObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }, { rootMargin: '-80px 0px 0px 0px' });
  const themeObserver = new MutationObserver(updateTheme);
  sizeObserver.observe(canvas);
  viewObserver.observe(host);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  updateTheme();
  resize();
  updateControls();
  controls.hidden = false;

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    events.abort();
    sizeObserver.disconnect();
    viewObserver.disconnect();
    themeObserver.disconnect();
    delete root.dataset.oceanMounted;
  };
}
