import React, { useEffect, useMemo, useRef, useState } from 'react';

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

const NAVIGATION: SearchItem[] = [
  { id: 'nav-home', title: '首页', category: 'Page', url: '/' },
  { id: 'nav-blog', title: '文章', category: 'Page', url: '/blog' },
  { id: 'nav-archive', title: '归档', category: 'Page', url: '/archive' },
  { id: 'nav-about', title: '关于', category: 'Page', url: '/about' },
];

export const CommandPalette: React.FC<Props> = ({ posts = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<SearchItem[]>(
    () => [
      ...NAVIGATION,
      ...posts.map((p) => ({
        id: `post-${p.slug}`,
        title: p.data.title,
        description: p.data.description,
        category: p.data.category || 'Post',
        url: `/blog/${p.slug}`,
        tags: p.data.tags,
      })),
    ],
    [posts]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 8);
    return items
      .filter((item) =>
        [item.title, item.description, item.category, ...(item.tags ?? [])]
          .join(' ')
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 10);
  }, [items, query]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    // Delegated so the trigger keeps working after a view transition swap.
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.closest('#cmd-palette-trigger')) {
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onClick);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelected(0);
      const id = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
    setQuery('');
  }, [isOpen]);

  if (!isOpen) return null;

  const go = (item: SearchItem) => {
    setIsOpen(false);
    window.location.href = item.url;
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((prev) => (prev + 1) % (results.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((prev) => (prev - 1 + results.length) % (results.length || 1));
    } else if (e.key === 'Enter' && results[selected]) {
      e.preventDefault();
      go(results[selected]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      <div
        className="fixed inset-0 scrim"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="搜索"
        className="relative w-full max-w-lg rounded-2xl surface overflow-hidden animate-rise"
      >
        <div className="flex items-center gap-2.5 px-4 h-12 border-b border-line">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-fg-subtle shrink-0"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.6-3.6" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="搜索文章或页面"
            className="w-full bg-transparent text-[14px] text-fg placeholder:text-fg-subtle outline-none border-none p-0 focus:ring-0"
          />
          <kbd className="shrink-0 px-1.5 py-0.5 rounded border border-line font-mono text-[10px] text-fg-subtle">
            ESC
          </kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-fg-subtle">没有结果</p>
          ) : (
            results.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item)}
                onMouseEnter={() => setSelected(index)}
                className={`w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  index === selected ? 'bg-surface-hover' : ''
                }`}
              >
                <span className="min-w-0 flex flex-col">
                  <span
                    className={`truncate text-[13px] ${
                      index === selected ? 'text-fg' : 'text-fg-muted'
                    }`}
                  >
                    {item.title}
                  </span>
                  {item.description && (
                    <span className="truncate text-[11px] text-fg-subtle">{item.description}</span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-fg-subtle">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
