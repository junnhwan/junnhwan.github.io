import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  originX: number;
  originY: number;
  size: number;
  color: string;
  paletteIdx: number;
  alpha: number;
  targetAlpha: number;
  ease: number;
  friction: number;
  delay: number;
  settled: boolean;
}

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  phase: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  strength: number;
  opacity: number;
}

const COLOR_THEMES = [
  {
    name: 'Cyber Cyan',
    colors: ['#00f2fe', '#38bdf8', '#60a5fa', '#34d399', '#f8fafc'],
    accent: '#00f2fe',
  },
  {
    name: 'Neon Aurora',
    colors: ['#a855f7', '#ec4899', '#06b6d4', '#10b981', '#fbcfe8'],
    accent: '#ec4899',
  },
  {
    name: 'Solar Flare',
    colors: ['#f59e0b', '#ef4444', '#fbbf24', '#f97316', '#fffbeb'],
    accent: '#f59e0b',
  },
];

export const ParticleHero: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [themeIdx, setThemeIdx] = useState(0);
  const [particleCount, setParticleCount] = useState(0);

  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const mouseRef = useRef<{ x: number; y: number; radius: number; isHover: boolean }>({
    x: -9999,
    y: -9999,
    radius: 110,
    isHover: false,
  });
  const animFrameIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const themeRef = useRef(COLOR_THEMES[0]);

  useEffect(() => {
    themeRef.current = COLOR_THEMES[themeIdx];
    const palette = COLOR_THEMES[themeIdx].colors;
    particlesRef.current.forEach((p) => {
      p.color = palette[p.paletteIdx % palette.length];
    });
  }, [themeIdx]);

  // Static gentle starfield (no jitter)
  const initStars = (width: number, height: number) => {
    const stars: Star[] = [];
    const count = Math.floor((width * height) / 14000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.2 + 0.4,
        alpha: Math.random() * 0.4 + 0.15,
        twinkleSpeed: Math.random() * 0.001 + 0.0005,
        phase: Math.random() * Math.PI * 2,
      });
    }
    starsRef.current = stars;
  };

  // Generate target coordinates for "HWAN"
  const generateTextCoordinates = useCallback((width: number, height: number) => {
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!offCtx) return [];

    // Responsive crisp font sizing
    const fontSize = Math.min(width * 0.22, 160);
    offCtx.font = `900 ${fontSize}px "JetBrains Mono", "Inter", -apple-system, sans-serif`;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillStyle = '#ffffff';

    const text = 'HWAN';
    const textY = height * 0.48;
    offCtx.fillText(text, width / 2, textY);

    const imgData = offCtx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const coords: { x: number; y: number }[] = [];

    // Density sampling
    const step = width < 640 ? 4 : 3;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        const alpha = data[index + 3];
        if (alpha > 128) {
          coords.push({ x, y });
        }
      }
    }

    return coords;
  }, []);

  // Assemble or Replay
  const initParticles = useCallback((replay = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    const coords = generateTextCoordinates(width, height);
    setParticleCount(coords.length);
    startTimeRef.current = Date.now();

    const centerX = width / 2;
    const centerY = height * 0.48;
    const maxRadius = Math.sqrt(width * width + height * height) * 0.6;
    const palette = themeRef.current.colors;

    const particles: Particle[] = coords.map((coord, idx) => {
      // Cosmic spiral origin outside
      const angle = Math.random() * Math.PI * 2 + (idx * 0.08);
      const dist = (Math.random() * 0.8 + 0.3) * maxRadius;

      const spawnX = centerX + Math.cos(angle) * dist;
      const spawnY = centerY + Math.sin(angle) * dist;

      const paletteIdx = Math.floor(Math.random() * palette.length);
      const color = palette[paletteIdx];
      const size = Math.random() * 0.8 + 1.4;

      // Stagger delay for organic wave entrance
      const distFromCenter = Math.sqrt(
        (coord.x - centerX) * (coord.x - centerX) + (coord.y - centerY) * (coord.y - centerY)
      );
      const delay = (distFromCenter / maxRadius) * 400 + Math.random() * 200;

      return {
        x: spawnX,
        y: spawnY,
        vx: 0,
        vy: 0,
        targetX: coord.x,
        targetY: coord.y,
        originX: spawnX,
        originY: spawnY,
        size,
        color,
        paletteIdx,
        alpha: 0,
        targetAlpha: Math.random() * 0.2 + 0.8,
        ease: Math.random() * 0.03 + 0.06,
        friction: 0.86,
        delay,
        settled: false,
      };
    });

    particlesRef.current = particles;
  }, [generateTextCoordinates]);

  // Handle Resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = Math.min(Math.max(window.innerHeight * 0.55, 360), 480);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    initStars(width, height);
    initParticles();
  }, [initParticles]);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const mouse = mouseRef.current;
      const now = Date.now();
      const elapsed = now - startTimeRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // 1. Static Gentle Stars (No flashing)
      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const a = star.alpha + Math.sin(now * star.twinkleSpeed + star.phase) * 0.08;
        ctx.fillStyle = `rgba(224, 242, 254, ${Math.max(0.08, a)})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Shockwaves
      const shockwaves = shockwavesRef.current;
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += (sw.maxRadius - sw.radius) * 0.08;
        sw.opacity *= 0.93;

        if (sw.opacity > 0.01) {
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 242, 254, ${sw.opacity * 0.6})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          shockwaves.splice(i, 1);
        }
      }

      // 3. Update & Render Particles
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (elapsed < p.delay) {
          // Waiting for stagger delay
          continue;
        }

        // Fade in smoothly
        if (p.alpha < p.targetAlpha) {
          p.alpha = Math.min(p.targetAlpha, p.alpha + 0.04);
        }

        // Distance to target
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Interaction Force (Mouse)
        let isInfluencedByMouse = false;
        if (mouse.isHover) {
          const mdx = p.x - mouse.x;
          const mdy = p.y - mouse.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (mdist < mouse.radius && mdist > 0) {
            isInfluencedByMouse = true;
            p.settled = false;
            const force = (1 - mdist / mouse.radius) * 10;
            const angle = Math.atan2(mdy, mdx);
            p.vx += Math.cos(angle) * force;
            p.vy += Math.sin(angle) * force;
          }
        }

        // Interaction Force (Shockwave)
        for (let s = 0; s < shockwaves.length; s++) {
          const sw = shockwaves[s];
          const sdx = p.x - sw.x;
          const sdy = p.y - sw.y;
          const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
          const ringDist = Math.abs(sdist - sw.radius);

          if (ringDist < 40 && sdist > 0) {
            p.settled = false;
            const push = (1 - ringDist / 40) * sw.strength * sw.opacity;
            const sAngle = Math.atan2(sdy, sdx);
            p.vx += Math.cos(sAngle) * push;
            p.vy += Math.sin(sAngle) * push;
          }
        }

        if (!p.settled) {
          // Spring towards target
          p.vx += dx * p.ease;
          p.vy += dy * p.ease;
          p.vx *= p.friction;
          p.vy *= p.friction;

          p.x += p.vx;
          p.y += p.vy;

          // Lock in place when settled and not influenced by mouse
          if (!isInfluencedByMouse && shockwaves.length === 0 && dist < 0.3 && Math.abs(p.vx) < 0.1 && Math.abs(p.vy) < 0.1) {
            p.x = p.targetX;
            p.y = p.targetY;
            p.vx = 0;
            p.vy = 0;
            p.settled = true;
          }
        }

        // Draw Particle (Solid, Crisp, Non-flickering)
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.restore();
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  // Mouse Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
    mouseRef.current.isHover = true;
  };

  const handleMouseLeave = () => {
    mouseRef.current.isHover = false;
    mouseRef.current.x = -9999;
    mouseRef.current.y = -9999;
  };

  // Click Shockwave Burst
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    shockwavesRef.current.push({
      x,
      y,
      radius: 10,
      maxRadius: Math.min(rect.width * 0.45, 240),
      strength: 14,
      opacity: 1,
    });
  };

  // Replay
  const handleReplay = () => {
    initParticles(true);
  };

  // Pulse
  const handlePulse = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    shockwavesRef.current.push({
      x: width / 2,
      y: height * 0.48,
      radius: 5,
      maxRadius: Math.min(width * 0.5, 300),
      strength: 20,
      opacity: 1,
    });
  };

  // Cycle Theme
  const handleNextTheme = () => {
    setThemeIdx((prev) => (prev + 1) % COLOR_THEMES.length);
  };

  return (
    <div ref={containerRef} className="relative w-full flex flex-col items-center justify-center pt-2 pb-8 select-none overflow-hidden">
      {/* Gentle, steady ambient background (No pulsating flicker) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[360px] bg-gradient-to-tr from-cyan-500/10 via-sky-500/5 to-purple-600/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Interactive Particle Canvas for HWAN */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="w-full cursor-crosshair touch-none"
        title="移动鼠标产生力场排斥，点击触发能量冲击波"
      />

      {/* Subtitle & Navigation Hub */}
      <div className="relative z-10 -mt-2 sm:-mt-4 flex flex-col items-center gap-5 px-4 text-center max-w-2xl">
        {/* Slogan */}
        <div className="space-y-1.5">
          <p className="text-sm sm:text-base font-medium text-slate-200 font-sans tracking-wide">
            Full-stack & AI Agent developer in the making.
          </p>
          <p className="text-xs font-mono text-cyan-400/90">
            Be here now · 记录技术学习与日常思考
          </p>
        </div>

        {/* Action Controls & Navigation Hub */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
          {/* Browse Blog Button */}
          <a
            href="/blog"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-medium text-xs border border-cyan-500/30 transition-all shadow-[0_0_15px_rgba(0,242,254,0.12)] hover:scale-105"
          >
            <span>浏览文章</span>
            <svg xmlns="http://www.w3.org/2005/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>

          {/* About Link */}
          <a
            href="/about"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-pill hover:bg-white/10 text-slate-300 hover:text-white text-xs border border-white/10 transition-all hover:scale-105"
          >
            <span>关于我 / About</span>
          </a>

          {/* GitHub Link */}
          <a
            href="https://github.com/junnhwan"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-pill hover:bg-white/10 text-slate-300 hover:text-white text-xs border border-white/10 transition-all hover:scale-105"
          >
            <svg xmlns="http://www.w3.org/2005/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
              <path d="M9 18c-4.51 2-5-2-7-2"></path>
            </svg>
            <span>GitHub</span>
          </a>

          {/* Interactive Replay Button */}
          <button
            type="button"
            onClick={handleReplay}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-cyan-300 text-xs font-mono border border-white/10 transition-all active:scale-95"
            title="重播星云汇聚粒子动画"
          >
            <svg xmlns="http://www.w3.org/2005/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
            <span>↻ 重播入场</span>
          </button>

          {/* Shockwave Blast button */}
          <button
            type="button"
            onClick={handlePulse}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-purple-300 text-xs font-mono border border-white/10 transition-all active:scale-95"
            title="发射中心引力波震荡粒子"
          >
            <span>⚡ 脉冲</span>
          </button>

          {/* Color Palette Toggle */}
          <button
            type="button"
            onClick={handleNextTheme}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-mono border border-white/10 transition-all active:scale-95"
            title="切换粒子光谱配色"
          >
            <span>🎨 {themeRef.current.name}</span>
          </button>
        </div>

        {/* Interactive Tip */}
        <p className="text-[11px] text-slate-500 font-mono">
          💡 互动玩法：移动鼠标力场排斥 · 点击画布释放冲击波 · 支持随时重播与换色
        </p>
      </div>
    </div>
  );
};
