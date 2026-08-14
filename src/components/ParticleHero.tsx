import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  size: number;
  color: string;
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

const COLOR_PALETTE = [
  '#00f2fe', // Electric Cyan
  '#38bdf8', // Neon Sky Blue
  '#60a5fa', // Indigo Blue
  '#34d399', // Mint Emerald
  '#a78bfa', // Cyber Purple
  '#f8fafc', // Starlight White
];

export const ParticleHero: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isAssembled, setIsAssembled] = useState(false);
  const [connectLines, setConnectLines] = useState(false);
  const [particleCount, setParticleCount] = useState(0);

  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const mouseRef = useRef<{ x: number; y: number; radius: number; isHover: boolean }>({
    x: -9999,
    y: -9999,
    radius: 120,
    isHover: false,
  });
  const animFrameIdRef = useRef<number | null>(null);
  const stageTimeRef = useRef<number>(0);
  const isFormingRef = useRef<boolean>(true);

  // Initialize background starfield
  const initStars = (width: number, height: number) => {
    const stars: Star[] = [];
    const count = Math.floor((width * height) / 18000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
      });
    }
    starsRef.current = stars;
  };

  // Generate target coordinates by rendering text on offscreen canvas
  const generateTextCoordinates = useCallback((width: number, height: number) => {
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!offCtx) return [];

    // Responsive font size calculation
    const fontSize = Math.min(width * 0.14, 110);
    offCtx.font = `900 ${fontSize}px "JetBrains Mono", "Inter", -apple-system, sans-serif`;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillStyle = '#ffffff';

    const text = 'junnhwan';
    const textY = height * 0.45;
    offCtx.fillText(text, width / 2, textY);

    const imgData = offCtx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const coords: { x: number; y: number }[] = [];

    // Sample spacing based on screen resolution
    const step = width < 640 ? 4 : 3;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        const alpha = data[index + 3];
        if (alpha > 128) {
          // Add slight jitter for organic tech dispersion
          coords.push({
            x: x + (Math.random() - 0.5) * 1.2,
            y: y + (Math.random() - 0.5) * 1.2,
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
    isFormingRef.current = true;
    setIsAssembled(false);
    stageTimeRef.current = 0;

    const centerX = width / 2;
    const centerY = height * 0.45;
    const maxRadius = Math.sqrt(width * width + height * height) * 0.6;

    const particles: Particle[] = coords.map((coord, idx) => {
      // Cosmic Vortex spawn math: disperse particles in a swirling spiral
      const angle = Math.random() * Math.PI * 2 + (idx * 0.05);
      const dist = (Math.random() * 0.8 + 0.2) * maxRadius;
      const spawnX = centerX + Math.cos(angle) * dist;
      const spawnY = centerY + Math.sin(angle) * dist;

      const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
      const size = Math.random() * 1.4 + 1.2;

      return {
        x: spawnX,
        y: spawnY,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        targetX: coord.x,
        targetY: coord.y,
        size,
        color,
        alpha: Math.random() * 0.3 + 0.2,
        baseAlpha: Math.random() * 0.3 + 0.7,
        angle,
        speed: Math.random() * 0.04 + 0.02,
        distance: dist,
        spring: Math.random() * 0.03 + 0.04,
        friction: Math.random() * 0.04 + 0.88,
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
    const height = Math.min(Math.max(window.innerHeight * 0.65, 420), 560);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    initStars(width, height);
    initParticles();
  }, [initParticles]);

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    handleResize();
    window.addEventListener('resize', handleResize);

    let lastTime = performance.now();

    const render = (time: number) => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const mouse = mouseRef.current;

      stageTimeRef.current += 1;
      const stageTime = stageTimeRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Trail clear for subtle neon luminescence
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

        const currentAlpha = star.alpha + Math.sin(stageTime * star.twinkleSpeed) * 0.25;
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

        if (sw.opacity > 0.02) {
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 242, 254, ${sw.opacity * 0.6})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius * 0.85, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(168, 85, 247, ${sw.opacity * 0.3})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          shockwaves.splice(i, 1);
        }
      }

      // 3. Update & Draw Particles
      const particles = particlesRef.current;
      let totalDistanceToTarget = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Cosmic swirl physics during formation phase
        if (stageTime < 90) {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          totalDistanceToTarget += dist;

          // Spiral vortex acceleration
          const swirlSpeed = Math.max(0.01, (90 - stageTime) * 0.001);
          p.angle += swirlSpeed;

          p.vx += dx * p.spring * 1.5;
          p.vy += dy * p.spring * 1.5;

          // Gradually brighten
          p.alpha = Math.min(p.baseAlpha, p.alpha + 0.02);
        } else {
          // Settled idle breathing + organic wave movement
          const waveX = Math.cos(stageTime * 0.02 + p.phase) * 0.8;
          const waveY = Math.sin(stageTime * 0.025 + p.phase) * 0.8;

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
            const force = (1 - mdist / mouse.radius) * 12;
            const angle = Math.atan2(mdy, mdx);
            p.vx += Math.cos(angle) * force;
            p.vy += Math.sin(angle) * force;
          }
        }

        // Shockwave explosion effect
        for (let s = 0; s < shockwaves.length; s++) {
          const sw = shockwaves[s];
          const sdx = p.x - sw.x;
          const sdy = p.y - sw.y;
          const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
          const ringDist = Math.abs(sdist - sw.radius);

          if (ringDist < 40 && sdist > 0) {
            const push = (1 - ringDist / 40) * sw.strength * sw.opacity;
            const sAngle = Math.atan2(sdy, sdx);
            p.vx += Math.cos(sAngle) * push;
            p.vy += Math.sin(sAngle) * push;
          }
        }

        // Apply friction & update position
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.x += p.vx;
        p.y += p.vy;

        // Render Particle with Glow
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Optional Constellation Neural Mesh Lines between neighboring particles
        if (connectLines && stageTime > 70 && i % 4 === 0) {
          for (let j = i + 1; j < Math.min(i + 12, particles.length); j++) {
            const p2 = particles[j];
            const cdx = p.x - p2.x;
            const cdy = p.y - p2.y;
            const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
            if (cdist < 18) {
              ctx.strokeStyle = `rgba(56, 189, 248, ${0.25 * (1 - cdist / 18)})`;
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

      // Mark assembly state after vortex completes
      if (stageTime > 90 && !isAssembled) {
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
      maxRadius: Math.min(rect.width * 0.4, 220),
      strength: 14,
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
      y: height * 0.45,
      radius: 5,
      maxRadius: Math.min(width * 0.5, 300),
      strength: 22,
      opacity: 1,
    });
  };

  return (
    <div ref={containerRef} className="relative w-full flex flex-col items-center justify-center pt-8 pb-4 select-none overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] bg-gradient-to-tr from-cyan-500/15 via-sky-500/10 to-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />

      {/* Interactive Particle Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="w-full cursor-crosshair touch-none"
        title="移动鼠标产生力场排斥，点击触发星云冲击波"
      />

      {/* Dynamic Subtitle & Interactive Badge Bar */}
      <div className="relative z-10 -mt-6 sm:-mt-8 flex flex-col items-center gap-4 px-4 text-center">
        {/* Slogan */}
        <div className="space-y-1.5 animate-fade-in">
          <p className="text-sm sm:text-base font-medium text-slate-300 font-sans tracking-wide">
            Be here now · 记录技术学习、后端开发与日常思考
          </p>
          <p className="text-xs font-mono text-cyan-400/80">
            Interactive Canvas Engine · {particleCount} Particles
          </p>
        </div>

        {/* Action Controls & Navigation Hub */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          {/* Browse Blog Button */}
          <a
            href="/blog"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-medium text-xs border border-cyan-500/30 transition-all shadow-[0_0_20px_rgba(0,242,254,0.15)] hover:scale-105"
          >
            <span>浏览全部文章</span>
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
            <span>↻ 重播粒子</span>
          </button>

          {/* Shockwave Blast button */}
          <button
            type="button"
            onClick={handleScatter}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-purple-300 text-xs font-mono border border-white/10 transition-all active:scale-95"
            title="发射中心引力波震荡粒子"
          >
            <span>⚡ 震荡</span>
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
            <span>✨ 星网连线: {connectLines ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Interactive Tip */}
        <p className="text-[11px] text-slate-500 font-mono pt-1">
          💡 提示：在画布上移动鼠标触发动力学排斥，点击任意位置释放冲击波
        </p>
      </div>
    </div>
  );
};
