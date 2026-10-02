export const GH_USER = 'junnhwan';

export const allMergedUrl = (repo?: string) => {
  const query = `is:pr is:merged author:${GH_USER}${repo ? ` repo:${repo}` : ''}`;
  return `https://github.com/search?q=${encodeURIComponent(query)}&type=pullrequests`;
};

export type RepoCounts = Record<string, number>;

export interface Contributions {
  counts: RepoCounts;
  total: number;
  repoCount: number;
  updatedAt: Date;
  /** `fallback` shows the bundled snapshot with its original date. */
  source: 'live' | 'fallback';
}

// Verified against GitHub search on 2026-10-02. A failed request must not label
// these cached numbers with the current build date.
const FALLBACK_UPDATED_AT = new Date('2026-10-02T00:00:00+08:00');
const FALLBACK_COUNTS: RepoCounts = {
  'The-PR-Agent/pr-agent': 34,
  'k8sgpt-ai/k8sgpt': 11,
  'kprompt/kprompt': 2,
  'ag2ai/ag2': 1,
  'kubevela/kubevela': 1,
  'k0sproject/k0smotron': 1,
  'updatecli/updatecli': 1,
  'kubeflow/sdk': 1,
  'volcano-sh/kthena': 1,
  'AlexsJones/llmfit': 1,
  'LeoninCS/GoClub': 1,
  'nightwalkerkkk123/Moments': 1,
};

interface SearchItem {
  id: number;
  repository_url: string;
}

interface SearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: SearchItem[];
}

async function fetchCounts(): Promise<RepoCounts> {
  const query = `is:pr is:merged author:${GH_USER}`;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': `${GH_USER}-blog-build`,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const counts: RepoCounts = {};
  const seen = new Set<number>();
  let expected = 0;

  // GitHub search returns at most 100 items per page and exposes 1,000 results.
  // Reject incomplete data instead of silently presenting a partial total.
  for (let page = 1; page <= 10; page += 1) {
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=100&page=${page}&sort=created&order=asc`;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`GitHub search returned ${response.status}`);

    const data = (await response.json()) as SearchResponse;
    if (data.incomplete_results || !Array.isArray(data.items) || !Number.isInteger(data.total_count)) {
      throw new Error('GitHub search returned incomplete results');
    }
    if (data.total_count > 1000) throw new Error('GitHub search result limit exceeded');
    if (page === 1) expected = data.total_count;
    else if (data.total_count !== expected) throw new Error('GitHub contributions changed during pagination');

    for (const item of data.items) {
      if (!Number.isInteger(item.id) || seen.has(item.id) || !item.repository_url?.startsWith('https://api.github.com/repos/')) {
        throw new Error('GitHub search returned invalid or duplicate results');
      }
      seen.add(item.id);
      const repo = item.repository_url.slice('https://api.github.com/repos/'.length);
      counts[repo] = (counts[repo] ?? 0) + 1;
    }
    if (seen.size === expected) return counts;
    if (data.items.length < 100) throw new Error('GitHub search returned a partial page');
  }
  throw new Error('GitHub search did not return all contributions');
}

export async function getContributions(): Promise<Contributions> {
  const summarise = (counts: RepoCounts, source: Contributions['source'], updatedAt: Date): Contributions => ({
    counts,
    total: Object.values(counts).reduce((sum, n) => sum + n, 0),
    repoCount: Object.keys(counts).length,
    updatedAt,
    source,
  });

  try {
    const counts = await fetchCounts();
    return summarise(counts, 'live', new Date());
  } catch (error) {
    console.warn(
      `[contributions] falling back to the bundled counts: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return summarise(FALLBACK_COUNTS, 'fallback', FALLBACK_UPDATED_AT);
  }
}
