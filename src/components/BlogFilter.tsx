import React, { useMemo, useState, useRef, useEffect } from 'react';

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

const ALL = '全部';

export const BlogFilter: React.FC<Props> = ({ posts }) => {
  const [category, setCategory] = useState<string>(ALL);
  const [tag, setTag] = useState<string>(ALL);
  const [query, setQuery] = useState<string>('');
  const resultsRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(posts.map((p) => p.data.category || 'Tech'))).sort()],
    [posts]
  );
  const tags = useMemo(
    () => [ALL, ...Array.from(new Set(posts.flatMap((p) => p.data.tags))).sort()],
    [posts]
  );

  const updateUrl = (nextCategory: string, nextTag: string) => {
    const params = new URLSearchParams();
    if (nextCategory !== ALL) params.set('category', nextCategory);
    if (nextTag !== ALL) params.set('tag', nextTag);
    const queryString = params.toString();
    window.history.replaceState(null, '', queryString ? `/blog?${queryString}` : '/blog');
  };

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCategory = params.get('category');
    const urlTag = params.get('tag');
    if (urlCategory && categories.includes(urlCategory)) setCategory(urlCategory);
    if (urlTag && tags.includes(urlTag)) setTag(urlTag);
  }, [categories, tags]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesCategory = category === ALL || post.data.category === category;
      const matchesTag = tag === ALL || post.data.tags.includes(tag);
      if (!q) return matchesCategory && matchesTag;
      const haystack = [post.data.title, post.data.description, ...post.data.tags]
        .join(' ')
        .toLowerCase();
      return matchesCategory && matchesTag && haystack.includes(q);
    });
  }, [posts, category, tag, query]);

  useEffect(() => {
    const element = resultsRef.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = element.animate(
      [{ opacity: 0.65 }, { opacity: 1 }],
      { duration: 150, easing: getComputedStyle(document.documentElement).getPropertyValue('--ease').trim() }
    );
    return () => animation.cancel();
  }, [filtered]);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
      <aside aria-label="文章筛选" className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-28">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-1 lg:flex-col lg:items-stretch">
            <span className="w-full mb-2 font-mono text-[11px] tracking-wider text-fg-subtle">
              分类
            </span>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setCategory(item);
                  updateUrl(item, tag);
                }}
                aria-pressed={category === item}
                className={`min-h-8 px-3 rounded-md text-left text-[13px] whitespace-nowrap transition-colors ${
                  category === item
                    ? 'bg-accent-soft text-accent'
                    : 'text-fg-subtle hover:text-fg hover:bg-surface-hover'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="relative order-first">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-0 top-1/2 -translate-y-1/2 text-fg-subtle"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.6-3.6" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索"
              aria-label="搜索文章"
              className="w-full h-8 pl-5 pr-2 bg-transparent border-0 border-b border-line text-[13px] text-fg placeholder:text-fg-subtle outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span className="w-full mb-2 font-mono text-[11px] tracking-wider text-fg-subtle">
            标签
          </span>
          {tags.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setTag(item);
                updateUrl(category, item);
              }}
              aria-pressed={tag === item}
              className={`h-7 px-3 rounded-full text-xs whitespace-nowrap transition-colors ${
                tag === item
                  ? 'bg-accent-soft text-accent'
                  : 'text-fg-subtle hover:text-fg hover:bg-surface-hover'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </aside>

      <div ref={resultsRef} className="min-w-0">
        {filtered.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <p className="text-sm text-fg-subtle">没有匹配的文章</p>
            <button
              type="button"
              onClick={() => {
                setCategory(ALL);
                setTag(ALL);
                setQuery('');
                updateUrl(ALL, ALL);
              }}
              className="text-xs text-accent hover:text-accent-hover transition-colors"
            >
              重置筛选
            </button>
          </div>
        ) : (
          <div className="border-t border-line">
            {filtered.map((post) => (
              <a key={post.slug} href={`/blog/${post.slug}`} className="article-row group block border-b border-line py-5 sm:py-6 pr-8">
                <span aria-hidden="true" className="article-arrow">↗</span>
                <div className="flex flex-col gap-2">
                  <time className="w-24 shrink-0 font-mono text-xs text-fg-subtle tabular-nums">
                    {post.data.pubDate}
                  </time>

                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="text-[17px] font-medium text-fg leading-relaxed transition-colors group-hover:text-accent">
                      {post.data.title}
                    </h2>
                    <p className="text-[13px] text-fg-subtle leading-relaxed line-clamp-2">
                      {post.data.description}
                    </p>
                  </div>

                  {post.data.category && (
                    <span className="shrink-0 font-mono text-[11px] text-fg-subtle">
                      {post.data.category}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}

        <p aria-live="polite" className="mt-5 font-mono text-[11px] text-fg-subtle">{filtered.length} 篇</p>
      </div>
    </div>
  );
};
