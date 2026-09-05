import { useEffect, useState } from 'react';
import { motion, useMotionTemplate, useReducedMotion, useSpring } from 'framer-motion';

// Original pen paths, kept as vectors so the signature stays sharp at any size.
const strokes = [
  'M32 98 C8 72 66 8 86 30 C100 47 59 123 39 151 M54 109 C86 79 126 76 145 77 M166 29 C148 60 126 115 124 140 C123 161 149 133 164 118',
  'M173 74 C186 36 203 36 200 60 L175 135 C167 164 202 126 241 72 C218 131 219 153 234 143 C261 121 279 81 292 59 C306 33 318 42 308 65 C299 88 279 112 263 119',
  'M286 144 C321 116 349 68 378 39 C389 28 395 29 390 43 C379 78 360 119 366 137 C371 152 390 137 403 124 M316 115 C342 95 374 91 397 94',
  'M399 139 C414 106 427 76 442 56 C450 43 455 43 454 56 L442 119 C440 143 448 145 460 128 C486 96 503 64 527 38 C546 17 558 29 545 51 C530 77 493 129 486 151 C482 166 501 160 517 147',
  'M517 147 C562 111 605 100 617 115 C636 140 495 169 371 175 C278 180 215 180 178 174 C158 170 164 166 180 164',
];

export function Wordmark() {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 180);
    return () => window.clearTimeout(timer);
  }, []);
  const [fine, setFine] = useState(false);
  const spring = { stiffness: 100, damping: 10, mass: 1 };
  const x = useSpring(0, spring);
  const y = useSpring(0, spring);
  const rotate = useSpring(0, spring);
  const transform = useMotionTemplate`translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg)`;
  useEffect(() => {
    const query = matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setFine(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (reduced || !fine) { x.set(0); y.set(0); rotate.set(0); }
  }, [reduced, fine, x, y, rotate]);
  return (
    <div className="signature-block" data-ready={ready}>
      <h1 aria-label="HWAN" className="signature-heading"
        onPointerMove={(event) => {
          if (reduced || !fine || event.pointerType === 'touch') return;
          const box = event.currentTarget.getBoundingClientRect();
          const dx = (event.clientX - box.left) / box.width - .5;
          const dy = (event.clientY - box.top) / box.height - .5;
          x.set(dx * 10); y.set(dy * 8); rotate.set(dx * 2.5);
        }}
        onPointerLeave={() => { x.set(0); y.set(0); rotate.set(0); }}>
        <motion.span className="signature-ink" style={{ transform }}>
          <svg viewBox="0 0 650 205" aria-hidden="true" focusable="false">
            {strokes.map((path, index) => (
              <path key={index} d={path} pathLength={1} className="signature-stroke"
                style={{ animationDelay: `${index * 600}ms`, strokeWidth: index === 4 ? 1.8 : 3.2 }} />
            ))}
          </svg>
        </motion.span>
      </h1>
      <p className="signature-motto" aria-label="Be Here Now">
        <span aria-hidden="true"><i>Be</i> <i>Here</i> <i>Now</i></span>
        <svg viewBox="0 0 240 22" aria-hidden="true" focusable="false"><path d="M8 15 Q100 0 227 10 M205 8 Q227 10 233 6" pathLength="1" /></svg>
      </p>
    </div>
  );
}
