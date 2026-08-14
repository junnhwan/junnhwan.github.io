import React, { useState, useEffect } from 'react';
import { TerminalCli } from './TerminalCli';

export const TerminalDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle when clicking backtick and not typing in an input
      if (e.key === '`' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleTrigger = () => setIsOpen(true);
    const triggerBtn = document.getElementById('terminal-drawer-trigger');
    triggerBtn?.addEventListener('click', handleTrigger);

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      triggerBtn?.removeEventListener('click', handleTrigger);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:p-6">
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      <div className="relative w-full max-w-3xl h-[480px] z-10 animate-slide-up">
        <div className="relative h-full">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute -top-10 right-2 px-3 py-1 rounded-full bg-slate-900/90 text-slate-400 hover:text-white text-xs border border-white/10 z-20 flex items-center gap-1"
          >
            <span>关闭终端 (ESC)</span>
          </button>
          <TerminalCli />
        </div>
      </div>
    </div>
  );
};
