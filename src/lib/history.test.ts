/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import {
  clearHistory,
  loadDraft,
  loadHistory,
  saveDraft,
  saveHistoryEntry,
  type HistoryEntry,
} from "@/lib/history";

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: "run-1",
    createdAt: 1,
    input: "repo notes",
    roastLevel: 58,
    platform: "cursor",
    source: "text",
    roastText: "needs work",
    rulesFiles: [{ path: "style.md", content: "# Style" }],
    ...overrides,
  };
}

afterEach(() => {
  window.localStorage.clear();
});

describe("loadHistory", () => {
  it("should return an empty list for missing, corrupt, or non-array storage", () => {
    expect(loadHistory()).toEqual([]);
    window.localStorage.setItem("rnr-history", "{not json");
    expect(loadHistory()).toEqual([]);
    window.localStorage.setItem("rnr-history", JSON.stringify({ id: "x" }));
    expect(loadHistory()).toEqual([]);
  });

  it("should drop entries that fail the shape guard", () => {
    window.localStorage.setItem(
      "rnr-history",
      JSON.stringify([
        entry(),
        { id: 1, input: "bad" },
        { ...entry({ id: "run-2" }), rulesFiles: "nope" },
      ]),
    );
    expect(loadHistory().map((e) => e.id)).toEqual(["run-1"]);
  });
});

describe("saveHistoryEntry", () => {
  it("should prepend and cap stored runs at 20", () => {
    for (let i = 0; i < 20; i++) {
      saveHistoryEntry(entry({ id: `old-${i}`, input: `n${i}` }));
    }
    const next = saveHistoryEntry(entry({ id: "newest" }));
    expect(next).toHaveLength(20);
    expect(next[0]?.id).toBe("newest");
    expect(next[19]?.id).toBe("old-1");
    expect(loadHistory()).toHaveLength(20);
  });
});

describe("clearHistory", () => {
  it("should wipe stored runs", () => {
    saveHistoryEntry(entry());
    expect(clearHistory()).toEqual([]);
    expect(loadHistory()).toEqual([]);
  });
});

describe("loadDraft", () => {
  it("should default roast level and platform when the draft is partial", () => {
    expect(loadDraft()).toBeNull();
    window.localStorage.setItem("rnr-draft", JSON.stringify({ input: "hi" }));
    expect(loadDraft()).toEqual({
      input: "hi",
      roastLevel: 58,
      platform: "cursor",
    });
  });

  it("should reject a draft without a string input", () => {
    window.localStorage.setItem(
      "rnr-draft",
      JSON.stringify({ roastLevel: 10, platform: "claude" }),
    );
    expect(loadDraft()).toBeNull();
    saveDraft({ input: "notes", roastLevel: 12, platform: "claude" });
    expect(loadDraft()).toEqual({
      input: "notes",
      roastLevel: 12,
      platform: "claude",
    });
  });
});
