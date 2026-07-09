import logger from '../logger.js';

/**
 * beToolkitSearch.ts
 * Fetches resources from Semantic Scholar, arXiv, and GitHub.
 * Returns up to 25 raw results for AI filtering.
 */

export interface RawResource {
  title: string;
  abstract: string;
  url: string;
  source: 'semantic_scholar' | 'arxiv' | 'github';
}

// ─── Semantic Scholar ─────────────────────────────────────────────────────────

async function fetchSemanticScholar(topic: string, limit = 10): Promise<RawResource[]> {
  const q = encodeURIComponent(topic);
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${q}&limit=${limit}&fields=title,abstract,openAccessPdf,externalIds`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'UNIEVAL/1.0 (educational tool)' },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    logger.warn(`[BEToolkit] Semantic Scholar HTTP ${res.status}`);
    return [];
  }

  const data = await res.json() as any;
  const papers: RawResource[] = [];

  for (const p of (data.data ?? [])) {
    const pdfUrl: string | null = p.openAccessPdf?.url ?? null;
    const arxivId: string | null = p.externalIds?.ArXiv ?? null;
    const link = pdfUrl
      ?? (arxivId ? `https://arxiv.org/abs/${arxivId}` : null);

    if (!link) continue; // skip paywalled papers
    papers.push({
      title: p.title ?? 'Untitled',
      abstract: p.abstract ?? '',
      url: link,
      source: 'semantic_scholar',
    });
  }
  return papers;
}

// ─── arXiv ────────────────────────────────────────────────────────────────────

async function fetchArXiv(topic: string, limit = 10): Promise<RawResource[]> {
  const q = encodeURIComponent(topic);
  const url = `https://export.arxiv.org/api/query?search_query=all:${q}&start=0&max_results=${limit}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    logger.warn(`[BEToolkit] arXiv HTTP ${res.status}`);
    return [];
  }

  const xml = await res.text();
  const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) ?? [];
  const results: RawResource[] = [];

  for (const entry of entries) {
    const title   = (entry.match(/<title>([\s\S]*?)<\/title>/))?.[1]?.trim().replace(/\s+/g, ' ') ?? '';
    const summary = (entry.match(/<summary>([\s\S]*?)<\/summary>/))?.[1]?.trim().replace(/\s+/g, ' ') ?? '';
    const idMatch = entry.match(/<id>(https?:\/\/arxiv\.org\/abs\/[^<]+)<\/id>/);
    const link    = idMatch?.[1] ?? '';

    if (!title || !link) continue;
    results.push({ title, abstract: summary, url: link, source: 'arxiv' });
  }
  return results;
}

// ─── GitHub ───────────────────────────────────────────────────────────────────

async function fetchGitHub(topic: string, limit = 8): Promise<RawResource[]> {
  const q   = encodeURIComponent(topic);
  const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=${limit}`;

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'UNIEVAL/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const ghToken = process.env.GITHUB_TOKEN;
  if (ghToken) headers['Authorization'] = `Bearer ${ghToken}`;

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });

  if (!res.ok) {
    logger.warn(`[BEToolkit] GitHub HTTP ${res.status}`);
    return [];
  }

  const data = await res.json() as any;
  return (data.items ?? []).map((repo: any) => ({
    title:    repo.full_name,
    abstract: repo.description ?? '',
    url:      repo.html_url,
    source:   'github' as const,
  }));
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function fetchResources(
  topic: string,
  category: 'research' | 'case-study' | 'project',
): Promise<RawResource[]> {
  const isProject = category === 'project';

  const [scholarly, arxivResults, ghResults] = await Promise.allSettled([
    isProject ? Promise.resolve([]) : fetchSemanticScholar(topic, 12),
    fetchArXiv(topic, 10),
    isProject ? fetchGitHub(topic, 10) : fetchGitHub(topic, 5),
  ]);

  const all: RawResource[] = [
    ...(scholarly.status === 'fulfilled' ? scholarly.value : []),
    ...(arxivResults.status === 'fulfilled' ? arxivResults.value : []),
    ...(ghResults.status === 'fulfilled' ? ghResults.value : []),
  ];

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = all.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  return unique.slice(0, 25);
}
