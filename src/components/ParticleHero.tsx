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
  baseSize: number;
  color: string;
  paletteIdx: number;
  alpha: number;
  baseAlpha: number;
  angle: number;
  speed: number;
  distance: number;
  spring: number;
  friction: number;
  phase: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  vx: number;
  vy: number;
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
  const [isAssembled, setIsAssembled] = useState(false);
  const [connectLines, setConnectLines] = useState(false);
  const [themeIdx, setThemeIdx] = useState(0);
  const [particleCount, setParticleCount] = useState(0);

  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const mouseRef = useRef<{ x: number; y: number; radius: number; isHover: boolean }>({
    x: -9999,
    y: -9999,
    radius: 130,
    isHover: false,
  });
  const animFrameIdRef = useRef<number | null>(null);
  const stageTimeRef = useRef<number>(0);
  const themeRef = useRef(COLOR_THEMES[0]);

  useEffect(() => {
    themeRef.current = COLOR_THEMES[themeIdx];
    // Update existing particle colors
    const palette = COLOR_THEMES[themeIdx].colors;
    particlesRef.current.forEach((p) => {
      p.color = palette[p.paletteIdx % palette.length];
    });
  }, [themeIdx]);

  // Initialize background starfield
  const initStars = (width: number, height: number) => {
    const stars: Star[] = [];
    const count = Math.floor((width * height) / 16000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.4,
        alpha: Math.random() * 0.7 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
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

    // Scale font size dynamically according to canvas width
    const fontSize = Math.min(width * 0.22, 170);
    offCtx.font = `900 ${fontSize}px "JetBrains Mono", "Inter", -apple-system, sans-serif`;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillStyle = '#ffffff';

    const text = 'HWAN';
    const textY = height * 0.46;
    offCtx.fillText(text, width / 2, textY);

    const imgData = offCtx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const coords: { x: number; y: number }[] = [];

    // Spacing step based on screen density
    const step = width < 640 ? 4 : 3;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        const alpha = data[index + 3];
        if (alpha > 120) {
          coords.push({
            x: x + (Math.random() - 0.5) * 0.8,
            y: y + (Math.random() - 0.5) * 0.8,
          });
        }
      }
    }

    return coords;
  }, []);

  // Assemble or Replay particle vortex
  const initParticles = useCallback((replay = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    const coords = generateTextCoordinates(width, height);
    setParticleCount(coords.length);
    setIsAssembled(false);
    stageTimeRef.current = 0;

    const centerX = width / 2;
    const centerY = height * 0.46;
    const maxRadius = Math.sqrt(width * width + height * height) * 0.65;
    const palette = themeRef.current.colors;

    const particles: Particle[] = coords.map((coord, idx) => {
      // Cosmic spiral distribution
      const spiralArms = 4;
      const armOffset = (idx % spiralArms) * ((Math.PI * 2) / spiralArms);
      const angle = Math.random() * Math.PI * 2 + armOffset;
      const dist = (Math.random() * 0.85 + 0.15) * maxRadius;

      const spawnX = centerX + Math.cos(angle) * dist;
      const spawnY = centerY + Math.sin(angle) * dist;

      const paletteIdx = Math.floor(Math.random() * palette.length);
      const color = palette[paletteIdx];
      const baseSize = Math.random() * 1.5 + 1.2;

      return {
        x: spawnX,
        y: spawnY,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        targetX: coord.x,
        targetY: coord.y,
        originX: spawnX,
        originY: spawnY,
        size: baseSize,
        baseSize,
        color,
        paletteIdx,
        alpha: Math.random() * 0.3 + 0.1,
        baseAlpha: Math.random() * 0.35 + 0.65,
        angle,
        speed: Math.random() * 0.03 + 0.015,
        distance: dist,
        spring: Math.random() * 0.025 + 0.04,
        friction: Math.random() * 0.03 + 0.87,
        phase: Math.random() * Math.PI * 2,
      };
    });

    particlesRef.current = particles;
  }, [generateTextCoordinates]);

  // Handle Canvas Resize and DPI
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = Math.min(Math.max(window.innerHeight * 0.58, 380), 500);

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

      stageTimeRef.current += 1;
      const stageTime = stageTimeRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Clean background clear
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Background Stars
      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.x += star.vx;
        star.y += star.vy;
        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        const currentAlpha = star.alpha + Math.sin(stageTime * star.twinkleSpeed) * 0.2;
        ctx.fillStyle = `rgba(224, 242, 254, ${Math.max(0.1, Math.min(1, currentAlpha))})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Update and Draw Shockwaves
      const shockwaves = shockwavesRef.current;
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += (sw.maxRadius - sw.radius) * 0.08;
        sw.opacity *= 0.94;

        if (sw.opacity > 0.015) {
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 242, 254, ${sw.opacity * 0.7})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius * 0.82, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(168, 85, 247, ${sw.opacity * 0.35})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else {
          shockwaves.splice(i, 1);
        }
      }

      // 3. Update & Draw Particles
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (stageTime < 95) {
          // Vortex convergence phase: Swirl inward towards target coordinates
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;

          // Tangential swirl force
          const swirlProgress = Math.max(0, (95 - stageTime) / 95);
          p.angle += swirlProgress * 0.05;

          p.vx += dx * p.spring * 1.6;
          p.vy += dy * p.spring * 1.6;

          p.alpha = Math.min(p.baseAlpha, p.alpha + 0.025);
        } else {
          // Assembled Harmonic Phase: Subtle breathing float
          const waveX = Math.cos(stageTime * 0.02 + p.phase) * 0.7;
          const waveY = Math.sin(stageTime * 0.025 + p.phase) * 0.7;

          const dx = (p.targetX + waveX) - p.x;
          const dy = (p.targetY + waveY) - p.y;

          p.vx += dx * p.spring;
          p.vy += dy * p.spring;

          p.alpha = p.baseAlpha;
        }

        // Mouse kinetic repulsion field
        if (mouse.isHover) {
          const mdx = p.x - mouse.x;
          const mdy = p.y - mouse.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (mdist < mouse.radius && mdist > 0) {
            const force = (1 - mdist / mouse.radius) * 14;
            const angle = Math.atan2(mdy, mdx);
            p.vx += Math.cos(angle) * force;
            p.vy += Math.sin(angle) * force;
            p.alpha = 1;
          }
        }

        // Shockwave impact
        for (let s = 0; s < shockwaves.length; s++) {
          const sw = shockwaves[s];
          const sdx = p.x - sw.x;
          const sdy = p.y - sw.y;
          const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
          const ringDist = Math.abs(sdist - sw.radius);

          if (ringDist < 45 && sdist > 0) {
            const push = (1 - ringDist / 45) * sw.strength * sw.opacity;
            const sAngle = Math.atan2(sdy, sdx);
            p.vx += Math.cos(sAngle) * push;
            p.vy += Math.sin(sAngle) * push;
          }
        }

        // Apply friction & update
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.x += p.vx;
        p.y += p.vy;

        // Render Particle
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Optional Constellation Neural Mesh Lines between neighboring particles
        if (connectLines && stageTime > 75 && i % 3 === 0) {
          for (let j = i + 1; j < Math.min(i + 14, particles.length); j++) {
            const p2 = particles[j];
            const cdx = p.x - p2.x;
            const cdy = p.y - p2.y;
            const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
            if (cdist < 18) {
              ctx.strokeStyle = `rgba(56, 189, 248, ${0.3 * (1 - cdist / 18)})`;
              ctx.lineWidth = 0.6;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      }

      ctx.globalAlpha = 1;

      if (stageTime > 95 && !isAssembled) {
        setIsAssembled(true);
      }

      ctx.restore();
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [connectLines, handleResize, isAssembled]);

  // Mouse Interactions
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

  // Click Trigger Shockwave Burst
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
      strength: 16,
      opacity: 1,
    });
  };

  // Replay Trigger
  const handleReplay = () => {
    initParticles(true);
  };

  // Scatter Pulse Trigger
  const handleScatter = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    shockwavesRef.current.push({
      x: width / 2,
      y: height * 0.46,
      radius: 5,
      maxRadius: Math.min(width * 0.55, 320),
      strength: 24,
      opacity: 1,
    });
  };

  // Cycle Theme
  const handleNextTheme = () => {
    setThemeIdx((prev) => (prev + 1) % COLOR_THEMES.length);
  };

  return (
    <div ref={containerRef} className="relative w-full flex flex-col items-center justify-center pt-4 pb-8 select-none overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-gradient-to-tr from-cyan-500/15 via-sky-500/10 to-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />

      {/* Interactive Particle Canvas for HWAN */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="w-full cursor-crosshair touch-none"
        title="移动鼠标产生力场排斥，点击触发能量冲击波"
      />

      {/* Subtitle & Core Navigation Hub */}
      <div className="relative z-10 -mt-4 sm:-mt-6 flex flex-col items-center gap-5 px-4 text-center max-w-2xl">
        {/* Slogan */}
        <div className="space-y-1.5">
          <p className="text-sm sm:text-base font-medium text-slate-200 font-sans tracking-wide">
            Full-stack & AI Agent developer in the making.
          </p>
          <p className="text-xs font-mono text-cyan-400/90">
            Be here now · 记录技术学习、后端开发与日常思考
          </p>
        </div>

        {/* Action Controls & Navigation Hub */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
          {/* Browse Blog Button */}
          <a
            href="/blog"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-medium text-xs border border-cyan-500/30 transition-all shadow-[0_0_20px_rgba(0,242,254,0.15)] hover:scale-105"
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
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-pill hover:bg-white/10 text-slate-300 hover:text-white text-xs border border-white/10 transition-all hover:scale-105"
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
            onClick={handleScatter}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-purple-300 text-xs font-mono border border-white/10 transition-all active:scale-95"
            title="发射中心引力波震荡粒子"
          >
            <span>⚡ 脉冲</span>
          </button>

          {/* Constellation Mesh Toggle */}
          <button
            type="button"
            onClick={() => setConnectLines((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono border transition-all active:scale-95 ${
              connectLines
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-white/5 text-slate-400 hover:text-slate-200 border-white/10'
            }`}
            title="切换星座连线模式"
          >
            <span>✨ 连线: {connectLines ? 'ON' : 'OFF'}</span>
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
