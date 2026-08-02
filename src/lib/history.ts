import type { PlatformId } from "@/lib/platforms";
import type { RuleFile } from "@/lib/parse-rules-output";

export type RunSource = "text" | "repo";

export type HistoryEntry = {
  id: string;
  createdAt: number;
  input: string;
  roastLevel: number;
  platform: PlatformId;
  source: RunSource;
  roastText: string;
  rulesFiles: RuleFile[];
  repoUrl?: string;
  language?: string;
};

const HISTORY_KEY = "rnr-history";
const DRAFT_KEY = "rnr-draft";
const MAX_ENTRIES = 20;

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is HistoryEntry =>
        e &&
        typeof e === "object" &&
        typeof e.id === "string" &&
        typeof e.input === "string" &&
        typeof e.roastText === "string" &&
        typeof e.roastLevel === "number" &&
        Array.isArray(e.rulesFiles),
    );
  } catch {
    return [];
  }
}

function persist(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // localStorage may be full or unavailable; ignore.
  }
}

export function saveHistoryEntry(entry: HistoryEntry): HistoryEntry[] {
  const entries = [entry, ...loadHistory()].slice(0, MAX_ENTRIES);
  persist(entries);
  return entries;
}

export function deleteHistoryEntry(id: string): HistoryEntry[] {
  const entries = loadHistory().filter((e) => e.id !== id);
  persist(entries);
  return entries;
}

export function clearHistory(): HistoryEntry[] {
  persist([]);
  return [];
}

export type Draft = {
  input: string;
  roastLevel: number;
  platform: PlatformId;
};

export function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (typeof parsed.input !== "string") return null;
    return {
      input: parsed.input,
      roastLevel:
        typeof parsed.roastLevel === "number" &&
        Number.isFinite(parsed.roastLevel)
          ? parsed.roastLevel
          : 58,
      platform:
        parsed.platform === "cursor" ||
        parsed.platform === "claude" ||
        parsed.platform === "windsurf" ||
        parsed.platform === "codex"
          ? parsed.platform
          : "cursor",
    };
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}
