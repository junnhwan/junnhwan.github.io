import React, { useState, useEffect, useRef } from 'react';

interface SearchItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  url: string;
  tags?: string[];
}

interface Props {
  posts: Array<{
    slug: string;
    data: {
      title: string;
      description: string;
      tags: string[];
      category?: string;
    };
  }>;
}

export const CommandPalette: React.FC<Props> = ({ posts = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build searchable items index
  const navigationItems: SearchItem[] = [
    { id: 'nav-home', title: '首页 / Home', description: '返回博客主页', category: 'Navigation', url: '/' },
    { id: 'nav-blog', title: '文章列表 / Blog Posts', description: '查看全部技术文章', category: 'Navigation', url: '/blog' },
    { id: 'nav-archive', title: '文章归档 / Archive', description: '按年份归档查看', category: 'Navigation', url: '/archive' },
    { id: 'nav-projects', title: '项目与开源 / Projects', description: 'Agent 与后端工程项目', category: 'Navigation', url: '/projects' },
    { id: 'nav-about', title: '关于作者 / About Me', description: '个人经历与联系方式', category: 'Navigation', url: '/about' },
  ];

  const postItems: SearchItem[] = posts.map((p) => ({
    id: `post-${p.slug}`,
    title: p.data.title,
    description: p.data.description,
    category: p.data.category || 'Article',
    url: `/blog/${p.slug}`,
    tags: p.data.tags,
  }));

  const allItems = [...navigationItems, ...postItems];

  const filteredItems = query.trim() === ''
    ? allItems.slice(0, 8)
    : allItems.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.tags?.some((t) => t.toLowerCase().includes(q))
        );
      }).slice(0, 10);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleOpenTrigger = () => setIsOpen(true);
    const triggerBtn = document.getElementById('cmd-palette-trigger');
    triggerBtn?.addEventListener('click', handleOpenTrigger);

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      triggerBtn?.removeEventListener('click', handleOpenTrigger);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const handleItemSelect = (item: SearchItem) => {
    setIsOpen(false);
    window.location.href = item.url;
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleItemSelect(filteredItems[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl rounded-2xl glass-card border border-white/10 shadow-2xl bg-slate-900/95 overflow-hidden animate-slide-up">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-slate-950/40">
          <svg xmlns="http://www.w3.org/2005/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-cyan-400 flex-shrink-0">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="搜索文章、标签或导航页面..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none border-none p-0 focus:ring-0"
          />
          <kbd className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-slate-400 border border-white/10">ESC</kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              未找到与 "{query}" 相关的结果
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleItemSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 truncate pr-2">
                    <span className="font-semibold text-slate-100 text-xs truncate">{item.title}</span>
                    {item.description && (
                      <span className="text-[11px] text-slate-400 truncate">{item.description}</span>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/5 text-slate-400 border border-white/5 flex-shrink-0">
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-white/5 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>导航: <kbd className="font-mono text-slate-400">↑</kbd> <kbd className="font-mono text-slate-400">↓</kbd></span>
            <span>选择: <kbd className="font-mono text-slate-400">↵</kbd></span>
          </div>
          <span>junnhwan.github.io</span>
        </div>
      </div>
    </div>
  );
};
