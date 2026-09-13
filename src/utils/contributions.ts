export const GH_USER = 'junnhwan';

export const allMergedUrl = (repo?: string) => {
  const query = `is:pr is:merged author:${GH_USER}${repo ? ` repo:${repo}` : ''}`;
  return `https://github.com/search?q=${encodeURIComponent(query)}&type=pullrequests`;
};

/**
 * Merged-PR counts per repository. The About page curates which PRs it lists
 * by hand; these numbers come from GitHub at build time so the totals do not
 * rot as more pull requests land.
 */
export type RepoCounts = Record<string, number>;

export interface Contributions {
  counts: RepoCounts;
  total: number;
  repoCount: number;
  updatedAt: Date;
  /** `fallback` means the GitHub request failed and the bundled counts are shown. */
  source: 'live' | 'fallback';
}

/**
 * Snapshot taken on 2026-09-13, used only when the build-time request fails.
 * A network problem should not fail the whole build, and showing a stale count
 * is better than showing none.
 */
const FALLBACK_COUNTS: RepoCounts = {
  'The-PR-Agent/pr-agent': 28,
  'k8sgpt-ai/k8sgpt': 5,
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
  repository_url: string;
}

async function fetchCounts(): Promise<RepoCounts> {
  const query = `is:pr is:merged author:${GH_USER}`;
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=100`;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': `${GH_USER}-blog-build`,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`GitHub search returned ${response.status}`);

  const data = (await response.json()) as { items?: SearchItem[] };
  const items = data.items ?? [];
  if (!items.length) throw new Error('GitHub search returned no merged PRs');

  const counts: RepoCounts = {};
  for (const item of items) {
    const repo = item.repository_url.replace('https://api.github.com/repos/', '');
    counts[repo] = (counts[repo] ?? 0) + 1;
  }
  return counts;
}

export async function getContributions(): Promise<Contributions> {
  const updatedAt = new Date();

  const summarise = (counts: RepoCounts, source: Contributions['source']): Contributions => ({
    counts,
    total: Object.values(counts).reduce((sum, n) => sum + n, 0),
    repoCount: Object.keys(counts).length,
    updatedAt,
    source,
  });

  try {
    return summarise(await fetchCounts(), 'live');
  } catch (error) {
    console.warn(
      `[contributions] falling back to the bundled counts: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return summarise(FALLBACK_COUNTS, 'fallback');
  }
}
