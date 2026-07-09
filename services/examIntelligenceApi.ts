import { ExamIntelligenceDoc } from '../types'; // Make sure this path matches where you saved types.ts

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

export type ListItem = Pick<ExamIntelligenceDoc, 'id' | 'subject' | 'semester' | 'branch' | 'year' | 'createdAt'>;

export async function listExamIntelligence(): Promise<ListItem[]> {
  return fetchJson('/exam-intelligence');
}

export async function getExamIntelligence(id: string): Promise<ExamIntelligenceDoc> {
  return fetchJson(`/exam-intelligence/${id}`);
}

export async function uploadExamIntelligence(
  data: Omit<ExamIntelligenceDoc, 'id' | 'createdAt'> | Omit<ExamIntelligenceDoc, 'id' | 'createdAt'>[]
): Promise<{ message: string; saved: string[]; skipped: string[] }> {
  return fetchJson('/exam-intelligence/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
}

export async function deleteExamIntelligence(id: string): Promise<{ message: string }> {
  return fetchJson(`/exam-intelligence/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
}