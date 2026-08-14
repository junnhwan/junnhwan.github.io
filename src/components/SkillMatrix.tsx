import React, { useState } from 'react';

interface Skill {
  name: string;
  category: 'ai' | 'backend' | 'frontend' | 'tools';
  highlight?: boolean;
}

const skillsData: Skill[] = [
  // AI & Agent
  { name: 'Claude Code', category: 'ai', highlight: true },
  { name: 'Agent Loop & ReAct', category: 'ai', highlight: true },
  { name: 'RAG Pipeline', category: 'ai', highlight: true },
  { name: 'LLM Function Calling', category: 'ai' },
  { name: 'Multi-Agent', category: 'ai' },
  { name: 'Prompt Engineering', category: 'ai' },

  // Backend
  { name: 'Go (Golang)', category: 'backend', highlight: true },
  { name: 'Java / Spring Boot', category: 'backend', highlight: true },
  { name: 'Redis Cache & Locking', category: 'backend', highlight: true },
  { name: 'MySQL & MyBatis', category: 'backend' },
  { name: 'RESTful API Design', category: 'backend' },
  { name: 'High Concurrency', category: 'backend' },

  // Frontend & UI
  { name: 'Astro', category: 'frontend', highlight: true },
  { name: 'React', category: 'frontend' },
  { name: 'TypeScript', category: 'frontend', highlight: true },
  { name: 'Tailwind CSS', category: 'frontend' },
  { name: 'Next.js', category: 'frontend' },
  { name: 'Vite', category: 'frontend' },

  // Tools & Infra
  { name: 'Docker', category: 'tools', highlight: true },
  { name: 'Git & GitHub Actions', category: 'tools', highlight: true },
  { name: 'Linux / Shell (zsh)', category: 'tools' },
  { name: 'Cursor / VS Code', category: 'tools' },
];

export const SkillMatrix: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'ai' | 'backend' | 'frontend' | 'tools'>('all');

  const filteredSkills = activeTab === 'all' 
    ? skillsData 
    : skillsData.filter((s) => s.category === activeTab);

  const tabs = [
    { id: 'all', label: '全部' },
    { id: 'ai', label: 'AI & Agent' },
    { id: 'backend', label: 'Backend' },
    { id: 'frontend', label: 'Frontend' },
    { id: 'tools', label: 'Tools & DevOps' },
  ];

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
            <h3 className="font-bold text-base text-white">技术矩阵 & 栈能力</h3>
          </div>
          <span className="text-xs font-mono text-slate-500">Tech Stack</span>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/60 border border-white/5 mb-4 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Skill Pills */}
        <div className="flex flex-wrap gap-2">
          {filteredSkills.map((skill) => (
            <div
              key={skill.name}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all duration-300 cursor-default flex items-center gap-1.5 ${
                skill.highlight
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/20 shadow-[0_0_15px_rgba(0,242,254,0.1)]'
                  : 'bg-white/5 text-slate-300 border border-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {skill.highlight && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              )}
              <span>{skill.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
        <span>持续构建与工程探索中</span>
        <span className="text-cyan-400 font-mono text-[11px]">Learn by Building ⚡</span>
      </div>
    </div>
  );
};
