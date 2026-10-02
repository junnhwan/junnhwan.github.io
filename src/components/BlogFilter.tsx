import React, { useEffect, useMemo, useState } from 'react';

interface PostItem {
  slug: string;
  data: {
    title: string;
    description: string;
    pubDate: string;
    isoDate?: string;
    readingTime?: string;
    tags: string[];
    category?: string;
    featured?: boolean;
  };
}
interface Props { posts: PostItem[]; }
const ALL = '全部';

export const BlogFilter: React.FC<Props> = ({ posts }) => {
  const [category, setCategory] = useState(ALL);
  const [tag, setTag] = useState(ALL);
  const [query, setQuery] = useState('');
  const categories = useMemo(() => [ALL, ...Array.from(new Set(posts.map((post) => post.data.category || 'Tech'))).sort()], [posts]);
  const tags = useMemo(() => [ALL, ...Array.from(new Set(posts.flatMap((post) => post.data.tags))).sort()], [posts]);

  useEffect(() => {
    const readUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const urlCategory = params.get('category');
      const urlTag = params.get('tag');
      setCategory(urlCategory && categories.includes(urlCategory) ? urlCategory : ALL);
      setTag(urlTag && tags.includes(urlTag) ? urlTag : ALL);
      setQuery(params.get('q') || '');
    };
    readUrl();
    window.addEventListener('popstate', readUrl);
    return () => window.removeEventListener('popstate', readUrl);
  }, [categories, tags]);

  const updateFilters = (nextCategory: string, nextTag: string, nextQuery: string) => {
    setCategory(nextCategory);
    setTag(nextTag);
    setQuery(nextQuery);
    const params = new URLSearchParams(window.location.search);
    if (nextCategory !== ALL) params.set('category', nextCategory);
    else params.delete('category');
    if (nextTag !== ALL) params.set('tag', nextTag);
    else params.delete('tag');
    if (nextQuery.trim()) params.set('q', nextQuery);
    else params.delete('q');
    const search = params.toString();
    window.history.replaceState(window.history.state, '', window.location.pathname + (search ? '?' + search : ''));
  };

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesCategory = category === ALL || (post.data.category || 'Tech') === category;
      const matchesTag = tag === ALL || post.data.tags.includes(tag);
      const haystack = [post.data.title, post.data.description, ...post.data.tags].join(' ').toLowerCase();
      return matchesCategory && matchesTag && (!search || haystack.includes(search));
    });
  }, [posts, category, tag, query]);
  const hasFilters = category !== ALL || tag !== ALL || query.trim() !== '';
  const reset = () => updateFilters(ALL, ALL, '');

  return (
    <div className="blog-browser">
      <aside className="blog-filters" aria-label="文章筛选">
        <label className="blog-search">
          <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.4 4.4" />
          </svg>
          <input type="search" value={query} onChange={(event) => updateFilters(category, tag, event.target.value)} placeholder="搜索文章" aria-label="搜索文章标题、摘要和标签" />
        </label>
        <div className="blog-category-section">
          <h2 className="blog-filter-label">按主题浏览</h2>
          <div className="blog-categories">
            {categories.map((item) => (
              <button key={item} type="button" onClick={() => updateFilters(item, tag, query)} aria-pressed={category === item} className="blog-category">
                <span>{item === ALL ? '全部文章' : item}</span>
                <span className="blog-category-count">{item === ALL ? posts.length : posts.filter((post) => (post.data.category || 'Tech') === item).length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="blog-tags-desktop">
          <h2 className="blog-filter-label">标签</h2>
          <div className="blog-tags">
            {tags.map((item) => (
              <button key={item} type="button" onClick={() => updateFilters(category, item, query)} aria-pressed={tag === item} className="blog-tag">{item}</button>
            ))}
          </div>
        </div>
        <label className="blog-tags-mobile">
          <span>标签</span>
          <select value={tag} onChange={(event) => updateFilters(category, event.target.value, query)}>
            {tags.map((item) => <option value={item} key={item}>{item === ALL ? '全部标签' : item}</option>)}
          </select>
        </label>
      </aside>

      <section className="blog-results" aria-label="文章列表">
        <div className="blog-results-heading">
          <p aria-live="polite" aria-atomic="true"><span>{category === ALL ? '全部文章' : category}</span><span className="blog-result-count">{filtered.length} 篇</span></p>
          {hasFilters && <button type="button" onClick={reset} className="blog-reset">清除筛选 <span aria-hidden="true">×</span></button>}
        </div>
        {filtered.length === 0 ? (
          <div className="blog-empty">
            <span aria-hidden="true" className="blog-empty-mark">∅</span>
            <h2>没有找到匹配的文章</h2><p>试试其他关键词，或清除当前筛选。</p>
            <button type="button" onClick={reset} className="blog-reset">查看全部文章 <span aria-hidden="true">→</span></button>
          </div>
        ) : (
          <div className="blog-posts">
            {filtered.map((post) => (
              <article key={post.slug} className="blog-post">
                <a href={'/blog/' + post.slug + '/'} className="blog-post-link">
                  <div className="blog-post-meta">
                    <time dateTime={post.data.isoDate || post.data.pubDate}>{post.data.pubDate}</time>
                    {post.data.category && <span className="blog-post-category">{post.data.category}</span>}
                    {post.data.readingTime && <span className="blog-post-reading">{post.data.readingTime}</span>}
                  </div>
                  <h2>{post.data.title}</h2>
                  <p className="blog-post-description">{post.data.description}</p>
                  <div className="blog-post-bottom">
                    <span className="blog-post-tags">{post.data.tags.slice(0, 3).map((item) => <span key={item}>{item}</span>)}</span>
                    <span className="blog-post-action">阅读全文 <span aria-hidden="true">↗</span></span>
                  </div>
                </a>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
