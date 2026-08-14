import React, { useState, useRef, useEffect } from 'react';

interface HistoryItem {
  command: string;
  output: React.ReactNode;
}

export const TerminalCli: React.FC = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      command: 'junnhwan --info',
      output: (
        <div className="text-slate-300 space-y-1">
          <p className="text-emerald-400 font-medium">junnhwan's terminal · Welcome!</p>
          <p className="text-xs text-slate-400">
            输入 <span className="text-cyan-400 font-bold">help</span> 查看可用命令。
          </p>
        </div>
      ),
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commandHistory, setCommandHistory] = useState<string[]>(['junnhwan --info']);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCommand = (cmdText: string) => {
    const raw = cmdText.trim();
    if (!raw) return;

    setCommandHistory((prev) => [...prev, raw]);
    setHistoryIndex(-1);

    const parts = raw.split(' ');
    const cmd = parts[0].toLowerCase();

    let output: React.ReactNode = null;

    switch (cmd) {
      case 'help':
        output = (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs py-1">
            <div><span className="text-cyan-400 font-bold font-mono">whoami</span> - 个人简介</div>
            <div><span className="text-cyan-400 font-bold font-mono">skills</span> - 技术栈</div>
            <div><span className="text-cyan-400 font-bold font-mono">posts</span> - 近期文章列表</div>
            <div><span className="text-cyan-400 font-bold font-mono">contact</span> - 联系方式 & GitHub</div>
            <div><span className="text-cyan-400 font-bold font-mono">clear</span> - 清空屏幕</div>
          </div>
        );
        break;

      case 'whoami':
        output = (
          <div className="text-xs space-y-1 py-1 text-slate-300">
            <p className="font-semibold text-white">junnhwan</p>
            <p className="text-slate-400">Be here now. 专注于 Java / Go 后端开发与技术学习记录。</p>
            <p className="text-slate-400">GitHub: <a href="https://github.com/junnhwan" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">https://github.com/junnhwan</a></p>
          </div>
        );
        break;

      case 'skills':
        output = (
          <div className="text-xs space-y-1.5 py-1">
            <div>
              <span className="text-cyan-400 font-bold">[Backend]:</span>
              <span className="text-slate-300 ml-2">Java, Spring Boot, Go, Redis, MySQL</span>
            </div>
            <div>
              <span className="text-emerald-400 font-bold">[Tech & AI]:</span>
              <span className="text-slate-300 ml-2">Agent 学习, Claude Code 源码, RAG, 算法</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold">[Tools]:</span>
              <span className="text-slate-300 ml-2">Git, Docker, Linux, Astro</span>
            </div>
          </div>
        );
        break;

      case 'posts':
        output = (
          <div className="text-xs space-y-1.5 py-1">
            <div className="text-slate-400">文章列表：</div>
            <div className="flex items-center justify-between">
              <a href="/blog/internship-summary-and-interview-review" className="text-cyan-400 hover:underline">
                • 一些随记，以及近期找实习面试复盘总结
              </a>
              <span className="text-slate-500 font-mono">2026-08-07</span>
            </div>
            <div className="flex items-center justify-between">
              <a href="/blog/interview-review-fosho-and-sangfor" className="text-cyan-400 hover:underline">
                • 近两周面试复盘：FOSHO & 深信服
              </a>
              <span className="text-slate-500 font-mono">2026-07-26</span>
            </div>
            <div className="flex items-center justify-between">
              <a href="/blog/learn-claude-code-notes" className="text-cyan-400 hover:underline">
                • learn-claude-code 学习记录
              </a>
              <span className="text-slate-500 font-mono">2026-06-21</span>
            </div>
            <div className="flex items-center justify-between">
              <a href="/blog/sky-takeout-day01" className="text-cyan-400 hover:underline">
                • Sky-takeout 苍穹外卖系列 (Day01-Day06)
              </a>
              <span className="text-slate-500 font-mono">2025-10</span>
            </div>
          </div>
        );
        break;

      case 'contact':
        output = (
          <div className="text-xs space-y-1 py-1 text-slate-300">
            <p>GitHub: <a href="https://github.com/junnhwan" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">https://github.com/junnhwan</a></p>
          </div>
        );
        break;

      case 'clear':
        setHistory([]);
        setInput('');
        return;

      default:
        output = (
          <div className="text-xs text-rose-400">
            zsh: command not found: {cmd}. 输入 <span className="text-white font-bold cursor-pointer underline" onClick={() => handleCommand('help')}>help</span> 查看帮助。
          </div>
        );
        break;
    }

    setHistory((prev) => [...prev, { command: raw, output }]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIdx = historyIndex + 1;
        if (nextIdx < commandHistory.length) {
          setHistoryIndex(nextIdx);
          setInput(commandHistory[commandHistory.length - 1 - nextIdx]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInput(commandHistory[commandHistory.length - 1 - nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const quickCommands = ['whoami', 'skills', 'posts', 'help', 'clear'];

  return (
    <div className="w-full rounded-2xl glass-card overflow-hidden border border-white/10 font-mono text-sm bg-slate-950/90 shadow-xl flex flex-col h-full min-h-[300px]">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-white/5 select-none">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80 hover:opacity-100 cursor-pointer" onClick={() => setHistory([])} title="清空" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="text-xs text-slate-400 ml-2 font-medium">junnhwan@dev: ~</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>zsh</span>
        </div>
      </div>

      {/* Quick Suggestion Chips */}
      <div className="flex items-center gap-1.5 px-4 py-1.5 bg-white/[0.02] border-b border-white/5 overflow-x-auto text-[11px] no-scrollbar">
        <span className="text-slate-500 mr-1 flex-shrink-0">Quick:</span>
        {quickCommands.map((cmd) => (
          <button
            key={cmd}
            type="button"
            onClick={() => handleCommand(cmd)}
            className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-cyan-500/15 hover:text-cyan-300 text-slate-400 border border-white/5 hover:border-cyan-500/30 transition-all flex-shrink-0"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Terminal Body */}
      <div
        className="p-4 overflow-y-auto flex-1 space-y-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent text-xs"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-emerald-400 font-bold">➜</span>
              <span className="text-cyan-400 font-semibold">~</span>
              <span className="text-slate-200 font-bold">{item.command}</span>
            </div>
            <div className="pl-4">{item.output}</div>
          </div>
        ))}

        {/* Active Input Line */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-emerald-400 font-bold">➜</span>
          <span className="text-cyan-400 font-semibold">~</span>
          <div className="relative flex-1 flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-slate-100 outline-none border-none p-0 focus:ring-0 font-mono text-xs"
              placeholder="type 'help'..."
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
