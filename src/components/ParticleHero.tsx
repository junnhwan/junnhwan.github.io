import React, { useCallback, useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  ease: number;
  delay: number;
  settled: boolean;
  /** Phase and amplitude of the idle drift, so the mark breathes instead of freezing. */
  phase: number;
  drift: number;
  bright: boolean;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  strength: number;
  opacity: number;
}

const TEXT = 'HWAN';

function readAccent(): { base: string; bright: string } {
  if (typeof window === 'undefined') return { base: '#5ec9b7', bright: '#e8ecf1' };
  const styles = getComputedStyle(document.documentElement);
  return {
    base: styles.getPropertyValue('--accent').trim() || '#5ec9b7',
    bright: styles.getPropertyValue('--fg').trim() || '#e8ecf1',
  };
}

export const ParticleHero: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const colorsRef = useRef({ base: '#5ec9b7', bright: '#e8ecf1' });
  const pointerRef = useRef({ x: -9999, y: -9999, radius: 90, active: false });
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number>(Date.now());
  const reducedMotion = useRef(false);

  const sampleTextPoints = useCallback((width: number, height: number) => {
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];

    const fontSize = Math.min(width * 0.2, 148);
    ctx.font = `600 ${fontSize}px "Inter Variable", Inter, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
      `${fontSize * 0.04}px`;
    ctx.fillStyle = '#fff';
    ctx.fillText(TEXT, width / 2, height * 0.46);

    const { data } = ctx.getImageData(0, 0, width, height);
    const points: { x: number; y: number }[] = [];
    // Sparser sampling than a solid fill: the letterforms should read as a
    // constellation, not a block of pixels.
    const step = width < 640 ? 6 : 5;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        if (data[(y * width + x) * 4 + 3] > 140) {
          // Jitter breaks up the sampling grid so the letters read as a
          // constellation rather than an LED matrix.
          points.push({
            x: x + (Math.random() - 0.5) * step * 0.6,
            y: y + (Math.random() - 0.5) * step * 0.6,
          });
        }
      }
    }

    return points;
  }, []);

  const buildParticles = useCallback(
    (replay = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const points = sampleTextPoints(width, height);

      startRef.current = Date.now();

      const centerX = width / 2;
      const centerY = height * 0.46;
      const spread = Math.hypot(width, height) * 0.35;

      const still = reducedMotion.current;

      particlesRef.current = points.map((point, index) => {
        const angle = (index * 0.618) * Math.PI * 2 + Math.random() * 0.6;
        const distance = (0.35 + Math.random() * 0.65) * spread;
        const spawnX = still ? point.x : centerX + Math.cos(angle) * distance;
        const spawnY = still ? point.y : centerY + Math.sin(angle) * distance * 0.7;
        const targetAlpha = 0.6 + Math.random() * 0.35;

        // Left-to-right reveal reads more deliberate than a radial burst.
        const delay = replay
          ? (point.x / width) * 420 + Math.random() * 160
          : (point.x / width) * 500 + Math.random() * 200;

        return {
          x: spawnX,
          y: spawnY,
          vx: 0,
          vy: 0,
          targetX: point.x,
          targetY: point.y,
          size: Math.random() * 0.55 + 1,
          alpha: still ? targetAlpha : 0,
          targetAlpha,
          ease: 0.045 + Math.random() * 0.02,
          delay: still ? 0 : delay,
          settled: still,
          phase: Math.random() * Math.PI * 2,
          drift: still ? 0 : 0.25 + Math.random() * 0.3,
          bright: Math.random() < 0.06,
        };
      });
    },
    [sampleTextPoints]
  );

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = Math.min(Math.max(window.innerHeight * 0.4, 260), 340);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    buildParticles();
  }, [buildParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    colorsRef.current = readAccent();

    resize();

    const onResize = () => resize();
    const onThemeChange = () => {
      colorsRef.current = readAccent();
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('themechange', onThemeChange);

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const now = Date.now();
      const elapsed = now - startRef.current;
      const pointer = pointerRef.current;
      const { base, bright } = colorsRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const shockwaves = shockwavesRef.current;
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const wave = shockwaves[i];
        wave.radius += (wave.maxRadius - wave.radius) * 0.07;
        wave.opacity *= 0.94;

        if (wave.opacity <= 0.015) {
          shockwaves.splice(i, 1);
        }
      }

      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (elapsed < p.delay) continue;

        if (p.alpha < p.targetAlpha) {
          p.alpha = Math.min(p.targetAlpha, p.alpha + 0.025);
        }

        let disturbed = false;

        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < pointer.radius && distance > 0.01) {
            disturbed = true;
            p.settled = false;
            const force = (1 - distance / pointer.radius) * 4.5;
            p.vx += (dx / distance) * force;
            p.vy += (dy / distance) * force;
          }
        }

        for (let s = 0; s < shockwaves.length; s++) {
          const wave = shockwaves[s];
          const dx = p.x - wave.x;
          const dy = p.y - wave.y;
          const distance = Math.hypot(dx, dy);
          const ring = Math.abs(distance - wave.radius);
          if (ring < 34 && distance > 0.01) {
            disturbed = true;
            p.settled = false;
            const push = (1 - ring / 34) * wave.strength * wave.opacity;
            p.vx += (dx / distance) * push;
            p.vy += (dy / distance) * push;
          }
        }

        if (p.settled) {
          // Idle: a sub-pixel breath so the mark stays alive without shimmering.
          const wobble = Math.sin(now * 0.0006 + p.phase) * p.drift;
          p.x = p.targetX + wobble;
          p.y = p.targetY + Math.cos(now * 0.00045 + p.phase) * p.drift * 0.7;
        } else {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;

          p.vx = (p.vx + dx * p.ease) * 0.88;
          p.vy = (p.vy + dy * p.ease) * 0.88;
          p.x += p.vx;
          p.y += p.vy;

          if (
            !disturbed &&
            shockwaves.length === 0 &&
            Math.hypot(dx, dy) < 0.4 &&
            Math.abs(p.vx) < 0.08 &&
            Math.abs(p.vy) < 0.08
          ) {
            p.settled = true;
            p.vx = 0;
            p.vy = 0;
          }
        }

        ctx.globalAlpha = p.bright ? Math.min(1, p.alpha + 0.3) : p.alpha;
        ctx.fillStyle = p.bright ? bright : base;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.restore();
      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('themechange', onThemeChange);
    };
  }, [resize]);

  const updatePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerRef.current.x = e.clientX - rect.left;
    pointerRef.current.y = e.clientY - rect.top;
    pointerRef.current.active = true;
  };

  const clearPointer = () => {
    pointerRef.current.active = false;
    pointerRef.current.x = -9999;
    pointerRef.current.y = -9999;
  };

  const emitShockwave = (x: number, y: number, strength = 7) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    shockwavesRef.current.push({
      x,
      y,
      radius: 6,
      maxRadius: Math.min((canvas.width / dpr) * 0.4, 220),
      strength,
      opacity: 1,
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    emitShockwave(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handlePulse = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    emitShockwave((canvas.width / dpr) / 2, (canvas.height / dpr) * 0.46, 10);
  };

  return (
    <div ref={containerRef} className="relative w-full flex flex-col items-center select-none">
      <canvas
        ref={canvasRef}
        onPointerMove={updatePointer}
        onPointerLeave={clearPointer}
        onClick={handleClick}
        className="w-full touch-none"
        aria-hidden="true"
      />

      <div className="relative z-10 -mt-6 sm:-mt-8 flex flex-col items-center gap-6 px-4 text-center">
        <div className="space-y-2">
          <h1 className="text-[15px] sm:text-base text-fg font-medium">
            Full-stack &amp; AI Agent developer in the making.
          </h1>
          <p className="text-[13px] text-fg-subtle">Be here now · 记录技术学习与日常思考</p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/blog"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-accent-soft text-accent text-[13px] border border-accent-line hover:border-accent transition-colors"
          >
            <span>浏览文章</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>

          <a
            href="/about"
            className="inline-flex items-center h-9 px-4 rounded-full pill text-fg-muted text-[13px]"
          >
            关于
          </a>

          {/* Canvas controls stay dim until you look for them */}
          <div className="flex items-center gap-0.5 opacity-30 hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => buildParticles(true)}
              className="grid place-items-center w-8 h-8 rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors"
              aria-label="重播动画"
              title="重播"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handlePulse}
              className="grid place-items-center w-8 h-8 rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors"
              aria-label="发射脉冲"
              title="脉冲"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="2.5" />
                <path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
