import React, { useState, useEffect, useMemo } from 'react';
import { BEToolkitItem } from '../types';
import {
  getBEToolkitItems,
  searchBEToolkit,
  SearchResult,
} from '../services/beToolkitApi';
import { useCredits } from '../context/AuthContext';

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  project:      '🔧 Project',
  research:     '🔬 Research',
  'case-study': '📋 Case Study',
};

const DIFFICULTY_CONFIG: Record<string, { label: string; classes: string }> = {
  easy:         { label: 'Easy',         classes: 'bg-green-100 text-green-700 border border-green-200' },
  medium:       { label: 'Medium',       classes: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
  hard:         { label: 'Hard',         classes: 'bg-red-100 text-red-700 border border-red-200' },
  Beginner:     { label: 'Beginner',     classes: 'bg-green-100 text-green-700 border border-green-200' },
  Intermediate: { label: 'Intermediate', classes: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
  Advanced:     { label: 'Advanced',     classes: 'bg-red-100 text-red-700 border border-red-200' },
};

const SOURCE_LABELS: Record<string, string> = {
  semantic_scholar: 'Semantic Scholar',
  arxiv:            'arXiv',
  github:           'GitHub',
};

// Unlimited plan users see only 5 results — buy credits for more
const UNLIMITED_PREVIEW_LIMIT = 5;

// ─── PDF Viewer Modal ─────────────────────────────────────────────────────────

interface PdfViewerProps { url: string; title: string; onClose: () => void; }

const PdfViewer: React.FC<PdfViewerProps> = ({ url, title, onClose }) => {
  const [summary,        setSummary]        = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError,   setSummaryError]   = useState('');
  const [downloading,    setDownloading]    = useState(false);

  // Google Docs Viewer — embeds PDF inline, first page visible, no redirect
  const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      let token = '';
      try { token = localStorage.getItem('token') || ''; } catch {}
      const res = await fetch('/api/be-toolkit/summarise-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url, title }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to generate summary' }));
        throw new Error(err.error || 'Failed to generate summary');
      }
      const data = await res.json();
      setSummary(data.summary);
    } catch (err: any) {
      setSummaryError(err.message || 'Failed to generate summary. Please try again.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleDownload = () => {
    setDownloading(true);
    const a = document.createElement('a');
    a.href = url;
    a.download = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDownloading(false), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-0.5">PDF Preview · First Page</p>
            <h2 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Inline PDF Frame */}
        <div className="relative bg-gray-100 shrink-0" style={{ height: '380px' }}>
          <iframe
            src={viewerUrl}
            className="w-full h-full border-0"
            title={title}
          />
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white/70 to-transparent pointer-events-none flex items-end justify-center pb-1">
            <span className="text-xs text-gray-400 italic">First page preview</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-5 pt-4 pb-3 flex gap-3 flex-wrap border-t border-gray-100 shrink-0">
          <button
            onClick={handleGenerateSummary}
            disabled={summaryLoading}
            className="flex items-center gap-2 text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {summaryLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate Summary
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 text-sm font-medium bg-white text-indigo-700 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-50 disabled:opacity-60 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </button>
        </div>

        {/* Summary Output */}
        <div className="overflow-y-auto">
          {summaryError && (
            <div className="mx-5 mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {summaryError}
            </div>
          )}
          {summary && (
            <div className="mx-5 mb-5 mt-1 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">AI Summary</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Upsell Banner ────────────────────────────────────────────────────────────

const UpsellBanner: React.FC = () => (
  <div className="col-span-full mt-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
    <div className="text-3xl shrink-0">🔒</div>
    <div className="flex-1">
      <p className="text-sm font-bold text-amber-800">You've seen your {UNLIMITED_PREVIEW_LIMIT} free results</p>
      <p className="text-xs text-amber-700 mt-0.5">
        Unlimited plan includes a preview of {UNLIMITED_PREVIEW_LIMIT} results per search.
        Purchase credits to unlock all results for research papers, case studies, and projects.
      </p>
    </div>
    <a
      href="/credits"
      className="shrink-0 text-xs font-semibold bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors shadow-sm whitespace-nowrap"
    >
      Buy Credits →
    </a>
  </div>
);

// ─── Static Toolkit Card ──────────────────────────────────────────────────────

const ToolkitCard: React.FC<{ item: BEToolkitItem; onViewPdf: (url: string, title: string) => void }> = ({ item, onViewPdf }) => {
  const diff  = DIFFICULTY_CONFIG[item.difficulty];
  const isPdf = item.link.toLowerCase().endsWith('.pdf');

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 hover:shadow-md hover:border-indigo-200 transition-all duration-200">
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          {TYPE_LABELS[item.type] ?? item.type}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${diff?.classes ?? ''}`}>
          {diff?.label ?? item.difficulty}
        </span>
        {isPdf && (
          <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-medium">PDF</span>
        )}
      </div>
      <h3 className="font-semibold text-gray-900 text-sm leading-snug">{item.title}</h3>
      <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{item.summary}</p>
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.map((tag, i) => (
            <span key={i} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-400 truncate max-w-[140px]">{item.source}</span>
        {isPdf ? (
          <button
            onClick={() => onViewPdf(item.link, item.title)}
            className="shrink-0 text-xs font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            View PDF →
          </button>
        ) : (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            View →
          </a>
        )}
      </div>
    </div>
  );
};

// ─── Search Result Card ───────────────────────────────────────────────────────

const SearchResultCard: React.FC<{
  result: SearchResult;
  index: number;
  onViewPdf: (url: string, title: string) => void;
}> = ({ result, index, onViewPdf }) => {
  const diff        = DIFFICULTY_CONFIG[result.difficulty] ?? DIFFICULTY_CONFIG['Intermediate'];
  const sourceLabel = SOURCE_LABELS[result.source] ?? result.source;
  const isArxiv     = result.link.includes('arxiv.org');
  const isGitHub    = result.link.includes('github.com');
  const isPdf       = result.link.toLowerCase().endsWith('.pdf') || isArxiv;

  const pdfUrl = isArxiv
    ? result.link.replace('/abs/', '/pdf/').replace(/\/?$/, '.pdf')
    : result.link;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 hover:shadow-md hover:border-indigo-200 transition-all duration-200">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-white bg-indigo-600 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${diff.classes}`}>
          {diff.label}
        </span>
        {sourceLabel && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {isArxiv ? '📄 arXiv' : isGitHub ? '💻 GitHub' : `📚 ${sourceLabel}`}
          </span>
        )}
        {isPdf && !isGitHub && (
          <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-medium">PDF</span>
        )}
      </div>
      <h3 className="font-semibold text-gray-900 text-sm leading-snug">{result.title}</h3>
      <p className="text-xs text-gray-600 leading-relaxed">{result.summary}</p>
      <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100">
        {isPdf && !isGitHub ? (
          <button
            onClick={() => onViewPdf(pdfUrl, result.title)}
            className="flex-1 text-center text-xs font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            📄 View PDF
          </button>
        ) : (
          <a
            href={result.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {isGitHub ? '⭐ View Repo' : '🔗 Open'}
          </a>
        )}
        <button
          onClick={() => navigator.clipboard?.writeText(result.link)}
          title="Copy link"
          className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5 border border-gray-200 rounded-lg transition-colors"
        >
          Copy
        </button>
      </div>
    </div>
  );
};

// ─── Search Panel ─────────────────────────────────────────────────────────────

interface SearchPanelProps {
  onResults: (results: SearchResult[], creditsUsed: number, remaining: number) => void;
}

const CATEGORY_OPTIONS = [
  { value: 'research',   label: '🔬 Research Papers' },
  { value: 'case-study', label: '📋 Case Studies' },
  { value: 'project',    label: '🔧 Projects / Repos' },
] as const;

const SearchPanel: React.FC<SearchPanelProps> = ({ onResults }) => {
  const [topic,    setTopic]    = useState('');
  const [category, setCategory] = useState<'research' | 'case-study' | 'project'>('research');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSearch = async () => {
    if (!topic.trim()) { setError('Please enter a topic to search.'); return; }
    setError('');
    setLoading(true);
    try {
      const { results, creditsUsed, remainingCredits } = await searchBEToolkit(topic.trim(), category);
      onResults(results, creditsUsed, remainingCredits);
    } catch (err: any) {
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl p-6 mb-8 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🔍</span>
        <div>
          <h2 className="text-base font-bold text-gray-900">AI-Powered Search</h2>
          <p className="text-xs text-gray-500">Searches arXiv, Semantic Scholar & GitHub · Costs 2 credits</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {CATEGORY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setCategory(opt.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              category === opt.value
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && handleSearch()}
          placeholder="e.g. Machine learning for traffic prediction…"
          className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="shrink-0 bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching…
            </>
          ) : 'Search'}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {loading && (
        <div className="mt-4 space-y-1">
          <p className="text-xs text-indigo-500 animate-pulse">Fetching from arXiv & Semantic Scholar…</p>
          <p className="text-xs text-indigo-400 animate-pulse">AI is filtering & ranking results…</p>
        </div>
      )}
    </div>
  );
};

// ─── Filter Bar ───────────────────────────────────────────────────────────────

interface Filters { branch: string; type: string; difficulty: string; tag: string; }

const FilterBar: React.FC<{
  filters: Filters;
  allBranches: string[];
  allTags: string[];
  onChange: (f: Filters) => void;
}> = ({ filters, allBranches, allTags, onChange }) => {
  const set = (key: keyof Filters) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    onChange({ ...filters, [key]: e.target.value });

  const selectClass = "text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <select value={filters.branch} onChange={set('branch')} className={selectClass}>
        <option value="">All Branches</option>
        {allBranches.map(b => <option key={b} value={b}>{b}</option>)}
      </select>
      <select value={filters.type} onChange={set('type')} className={selectClass}>
        <option value="">All Types</option>
        {Object.entries(TYPE_LABELS).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
      </select>
      <select value={filters.difficulty} onChange={set('difficulty')} className={selectClass}>
        <option value="">All Difficulties</option>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
      <select value={filters.tag} onChange={set('tag')} className={selectClass}>
        <option value="">All Tags</option>
        {allTags.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      {(filters.branch || filters.type || filters.difficulty || filters.tag) && (
        <button
          onClick={() => onChange({ branch: '', type: '', difficulty: '', tag: '' })}
          className="text-sm text-gray-500 hover:text-red-500 transition-colors underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const BEToolkit: React.FC = () => {
  const { isUnlimited } = useCredits();

  const [items,         setItems]         = useState<BEToolkitItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [filters,       setFilters]       = useState<Filters>({ branch: '', type: '', difficulty: '', tag: '' });
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [creditsInfo,   setCreditsInfo]   = useState<{ used: number; remaining: number } | null>(null);
  const [activeTab,     setActiveTab]     = useState<'library' | 'search'>('search');
  const [pdfViewer,     setPdfViewer]     = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    getBEToolkitItems()
      .then(setItems)
      .catch(() => setError('Failed to load toolkit items.'))
      .finally(() => setLoading(false));
  }, []);

  const allBranches = useMemo(() => [...new Set(items.map(i => i.branch))].sort(), [items]);
  const allTags     = useMemo(() => [...new Set(items.flatMap(i => i.tags))].sort(), [items]);

  const filtered = useMemo(() => items.filter(item => {
    if (filters.branch     && item.branch     !== filters.branch)     return false;
    if (filters.type       && item.type       !== filters.type)       return false;
    if (filters.difficulty && item.difficulty !== filters.difficulty) return false;
    if (filters.tag        && !item.tags.includes(filters.tag))       return false;
    return true;
  }), [items, filters]);

  const grouped = useMemo(() => {
    const byBranch: Record<string, Record<string, BEToolkitItem[]>> = {};
    for (const item of filtered) {
      if (!byBranch[item.branch]) byBranch[item.branch] = {};
      if (!byBranch[item.branch][item.type]) byBranch[item.branch][item.type] = [];
      byBranch[item.branch][item.type].push(item);
    }
    return byBranch;
  }, [filtered]);

  const handleSearchResults = (results: SearchResult[], creditsUsed: number, remaining: number) => {
    setSearchResults(results);
    setCreditsInfo({ used: creditsUsed, remaining });
  };

  // Unlimited plan users: show only 5 results across ALL categories, then upsell
  const displayedResults = useMemo(() => {
    if (!searchResults) return null;
    if (isUnlimited) return searchResults.slice(0, UNLIMITED_PREVIEW_LIMIT);
    return searchResults;
  }, [searchResults, isUnlimited]);

  const showUpsell =
    isUnlimited &&
    searchResults !== null &&
    searchResults.length > UNLIMITED_PREVIEW_LIMIT;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">

      {/* PDF Viewer Modal */}
      {pdfViewer && (
        <PdfViewer
          url={pdfViewer.url}
          title={pdfViewer.title}
          onClose={() => setPdfViewer(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">BE Toolkit</h1>
        <p className="mt-2 text-gray-600">Curated projects, research papers, and case studies for BE students.</p>
        <p className="mt-1 text-xs text-gray-400">All resources link to open-access sources (arXiv, Semantic Scholar, GitHub). No paywalls.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'search',  label: '🔍 AI Search' },
          { key: 'library', label: '📚 Curated Library' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* ── AI SEARCH TAB ── */}
      {activeTab === 'search' && (
        <>
          <SearchPanel onResults={handleSearchResults} />

          {creditsInfo && (
            <div className="mb-4 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
              <span>✅ {creditsInfo.used} credit{creditsInfo.used !== 1 ? 's' : ''} used</span>
              <span className="text-gray-300">·</span>
              <span>💰 {creditsInfo.remaining} remaining</span>
            </div>
          )}

          {displayedResults === null ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <span className="text-5xl mb-4">🔬</span>
              <p className="text-sm font-medium text-gray-500">Enter a topic above to discover resources</p>
              <p className="text-xs mt-1">Powered by arXiv · Semantic Scholar · GitHub</p>
            </div>
          ) : displayedResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <span className="text-4xl mb-3">😕</span>
              <p className="text-sm">No relevant resources found. Try different keywords.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-bold text-gray-800">
                  {displayedResults.length} Result{displayedResults.length !== 1 ? 's' : ''} Found
                  {showUpsell && (
                    <span className="ml-2 text-xs font-normal text-amber-600">
                      (showing {UNLIMITED_PREVIEW_LIMIT} of {searchResults!.length})
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => { setSearchResults(null); setCreditsInfo(null); }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline ml-auto"
                >
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedResults.map((result, i) => (
                  <SearchResultCard
                    key={i}
                    result={result}
                    index={i}
                    onViewPdf={(url, title) => setPdfViewer({ url, title })}
                  />
                ))}
                {showUpsell && <UpsellBanner />}
              </div>
            </>
          )}
        </>
      )}

      {/* ── LIBRARY TAB ── */}
      {activeTab === 'library' && (
        loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading library…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="text-4xl mb-3">🛠️</span>
            <p className="text-sm">No toolkit items yet. Check back soon.</p>
          </div>
        ) : (
          <>
            <FilterBar
              filters={filters}
              allBranches={allBranches}
              allTags={allTags}
              onChange={setFilters}
            />

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <span className="text-3xl mb-3">🔍</span>
                <p className="text-sm">No items match the selected filters.</p>
              </div>
            ) : (
              Object.entries(grouped).map(([branch, byType]) => (
                <div key={branch} className="mb-10">
                  <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <span className="w-1 h-6 bg-indigo-600 rounded-full inline-block"></span>
                    {branch}
                  </h2>
                  {Object.entries(byType).map(([type, typeItems]) => (
                    <div key={type} className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        {TYPE_LABELS[type] ?? type} · {typeItems.length} item{typeItems.length !== 1 ? 's' : ''}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {typeItems.map(item => (
                          <ToolkitCard
                            key={item.id}
                            item={item}
                            onViewPdf={(url, title) => setPdfViewer({ url, title })}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </>
        )
      )}
    </div>
  );
};

export default BEToolkit;