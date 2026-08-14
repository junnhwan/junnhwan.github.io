import React, { useState } from 'react';

interface Skill {
  name: string;
  category: 'backend' | 'ai' | 'tools';
}

const skillsData: Skill[] = [
  // Backend
  { name: 'Go (Golang)', category: 'backend' },
  { name: 'Java', category: 'backend' },
  { name: 'Spring Boot', category: 'backend' },
  { name: 'Redis', category: 'backend' },
  { name: 'MySQL', category: 'backend' },
  { name: 'MyBatis', category: 'backend' },

  // AI & Study
  { name: 'Claude Code', category: 'ai' },
  { name: 'Agent 机制', category: 'ai' },
  { name: 'Tool Calling', category: 'ai' },
  { name: 'RAG', category: 'ai' },

  // Tools & Others
  { name: 'Git', category: 'tools' },
  { name: 'Docker', category: 'tools' },
  { name: 'Linux', category: 'tools' },
  { name: 'Astro', category: 'tools' },
];

export const SkillMatrix: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'backend' | 'ai' | 'tools'>('all');

  const filteredSkills = activeTab === 'all' 
    ? skillsData 
    : skillsData.filter((s) => s.category === activeTab);

  const tabs = [
    { id: 'all', label: '全部' },
    { id: 'backend', label: '后端' },
    { id: 'ai', label: 'Agent & AI' },
    { id: 'tools', label: '工具' },
  ];

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm text-white">技术栈 / Stack</h3>
          <span className="text-xs font-mono text-slate-500">{skillsData.length} Tags</span>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/60 border border-white/5 mb-3 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Skill Pills */}
        <div className="flex flex-wrap gap-1.5">
          {filteredSkills.map((skill) => (
            <span
              key={skill.name}
              className="px-2.5 py-1 rounded-lg text-xs font-mono bg-white/5 text-slate-300 border border-white/5 hover:border-cyan-500/30 hover:text-cyan-300 transition-colors cursor-default"
            >
              {skill.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
