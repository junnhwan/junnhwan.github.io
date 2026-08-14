import React, { useState } from 'react';

interface PostItem {
  slug: string;
  body?: string;
  data: {
    title: string;
    description: string;
    pubDate: string;
    tags: string[];
    category?: string;
    featured?: boolean;
  };
}

interface Props {
  posts: PostItem[];
}

export const BlogFilter: React.FC<Props> = ({ posts }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract all categories
  const categories = ['全部', ...Array.from(new Set(posts.map((p) => p.data.category || 'Tech')))];

  const filteredPosts = posts.filter((post) => {
    const matchesCategory =
      selectedCategory === '全部' || post.data.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      post.data.title.toLowerCase().includes(q) ||
      post.data.description.toLowerCase().includes(q) ||
      post.data.tags.some((t) => t.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search & Category Filter Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl glass-card bg-slate-950/70 border border-white/5">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex-shrink-0 ${
                selectedCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative flex-1 sm:max-w-xs">
          <svg xmlns="http://www.w3.org/2005/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索文章关键字或标签..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
          />
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-mono">
        <span>共找到 {filteredPosts.length} 篇文章</span>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-cyan-400 hover:underline"
          >
            清除搜索
          </button>
        )}
      </div>

      {/* Posts Grid */}
      {filteredPosts.length === 0 ? (
        <div className="py-16 text-center rounded-2xl glass-card border border-white/5 bg-slate-950/40">
          <p className="text-slate-400 text-sm">没有找到匹配的文章</p>
          <button
            onClick={() => {
              setSelectedCategory('全部');
              setSearchQuery('');
            }}
            className="mt-3 px-4 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 text-xs border border-cyan-500/30 hover:bg-cyan-500/30"
          >
            重置筛选条件
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPosts.map((post) => (
            <article
              key={post.slug}
              className="group relative rounded-2xl glass-card p-5 bg-slate-950/70 border border-white/5 hover:border-cyan-500/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {post.data.category && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {post.data.category}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-mono">
                      {post.data.pubDate}
                    </span>
                  </div>
                </div>

                <a href={`/blog/${post.slug}`} className="block group/title">
                  <h3 className="text-base font-bold text-white group-hover/title:text-cyan-400 transition-colors leading-snug">
                    {post.data.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed line-clamp-2">
                    {post.data.description}
                  </p>
                </a>
              </div>

              <div className="pt-3 mt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {post.data.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded text-[11px] font-mono text-slate-400 bg-white/[0.03] border border-white/5"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <a
                  href={`/blog/${post.slug}`}
                  class="text-xs font-semibold text-cyan-400 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                >
                  <span>阅读</span>
                  <svg xmlns="http://www.w3.org/2005/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
