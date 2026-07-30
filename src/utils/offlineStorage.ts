import { CivicReport } from '../types';

const DRAFTS_KEY = 'jharkhand_civic_drafts_v1';

export function getOfflineDrafts(): CivicReport[] {
  try {
    const data = localStorage.getItem(DRAFTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading offline drafts:', err);
    return [];
  }
}

export function saveOfflineDraft(draft: CivicReport): CivicReport[] {
  try {
    const existing = getOfflineDrafts();
    const updated = [draft, ...existing.filter(d => d.id !== draft.id)];
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error saving draft:', err);
    return [];
  }
}

export function removeOfflineDraft(id: string): CivicReport[] {
  try {
    const existing = getOfflineDrafts();
    const updated = existing.filter(d => d.id !== id);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error removing draft:', err);
    return [];
  }
}
