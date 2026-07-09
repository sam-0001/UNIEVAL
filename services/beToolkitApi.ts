import { BEToolkitItem } from '../types';

const API_BASE = '/api';

function authHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem('token');
    if (token) return { 'Authorization': `Bearer ${token}` };
  } catch {}
  return {};
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export interface BEToolkitFilters {
  branch?: string;
  type?: string;
  difficulty?: string;
  tag?: string;
}

export async function getBEToolkitItems(filters: BEToolkitFilters = {}): Promise<BEToolkitItem[]> {
  const params = new URLSearchParams();
  if (filters.branch)     params.set('branch', filters.branch);
  if (filters.type)       params.set('type', filters.type);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.tag)        params.set('tag', filters.tag);
  const qs = params.toString();
  return fetchJson(`/be-toolkit${qs ? `?${qs}` : ''}`);
}

export async function addBEToolkitItem(data: Omit<BEToolkitItem, 'id' | 'createdAt'>): Promise<{ message: string; id: string }> {
  return fetchJson('/be-toolkit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
}

// ─── AI-powered search ────────────────────────────────────────────────────────

export interface SearchResult {
  title: string;
  summary: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  link: string;
  source: string;
}

export interface SearchResponse {
  results: SearchResult[];
  creditsUsed: number;
  remainingCredits: number;
}

export async function searchBEToolkit(
  topic: string,
  category: 'research' | 'case-study' | 'project',
): Promise<SearchResponse> {
  return fetchJson('/be-toolkit/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ topic, category }),
  });
}

