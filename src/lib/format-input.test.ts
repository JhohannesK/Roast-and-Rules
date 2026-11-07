import { describe, expect, it } from "vitest";
import {
  formatUserContent,
  MAX_INPUT_FILE_CHARS,
  MAX_INPUT_FILES,
  MAX_INPUT_TOTAL_CHARS,
  sanitizeFiles,
} from "@/lib/format-input";

describe("sanitizeFiles", () => {
  it("should return null for a non-array payload", () => {
    expect(sanitizeFiles(undefined)).toBeNull();
    expect(sanitizeFiles(null)).toBeNull();
    expect(sanitizeFiles({ path: "a.ts", content: "x" })).toBeNull();
  });

  it("should skip entries without a path or content", () => {
    expect(
      sanitizeFiles([
        null,
        "nope",
        { path: "  ", content: "hello" },
        { path: "a.ts", content: "" },
        { path: " b.ts ", content: "ok" },
      ]),
    ).toEqual([{ path: "b.ts", content: "ok" }]);
  });

  it("should cap each file and stop at the file and total char limits", () => {
    const oversized = "x".repeat(MAX_INPUT_FILE_CHARS + 50);
    const capped = sanitizeFiles([{ path: "big.ts", content: oversized }]);
    expect(capped).toEqual([
      { path: "big.ts", content: "x".repeat(MAX_INPUT_FILE_CHARS) },
    ]);

    const files = Array.from({ length: MAX_INPUT_FILES + 5 }, (_, i) => ({
      path: `f${i}.ts`,
      content: "ok",
    }));
    expect(sanitizeFiles(files)).toHaveLength(MAX_INPUT_FILES);

    const chunk = "y".repeat(MAX_INPUT_FILE_CHARS);
    const overflowing = Array.from(
      { length: Math.floor(MAX_INPUT_TOTAL_CHARS / MAX_INPUT_FILE_CHARS) + 2 },
      (_, i) => ({ path: `c${i}.ts`, content: chunk }),
    );
    const kept = sanitizeFiles(overflowing);
    const total = kept?.reduce((sum, f) => sum + f.content.length, 0) ?? 0;
    expect(kept?.length).toBe(
      Math.floor(MAX_INPUT_TOTAL_CHARS / MAX_INPUT_FILE_CHARS),
    );
    expect(total).toBeLessThanOrEqual(MAX_INPUT_TOTAL_CHARS);
  });
});

describe("formatUserContent", () => {
  it("should include the file tree, truncated contents, and notes", () => {
    const prompt = formatUserContent("  ship it  ", [
      { path: "a.ts", content: "export const a = 1;" },
    ]);
    expect(prompt).toContain("--- Repository file tree ---\na.ts");
    expect(prompt).toContain("======== a.ts ========\nexport const a = 1;");
    expect(prompt).toContain("--- User notes / description ---\nship it");
  });

  it("should omit empty notes and missing files", () => {
    expect(formatUserContent("   ")).toBe("");
    expect(formatUserContent("hello")).toBe(
      "--- User notes / description ---\nhello",
    );
  });
});
