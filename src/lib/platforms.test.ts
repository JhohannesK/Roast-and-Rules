import { describe, expect, it } from "vitest";
import {
  getPlatform,
  normalizeRulePath,
  zipFileName,
} from "@/lib/platforms";

const cursor = getPlatform("cursor");
const windsurf = getPlatform("windsurf");
const codex = getPlatform("codex");

describe("getPlatform", () => {
  it("should fall back to cursor for an unknown id", () => {
    expect(getPlatform("not-a-platform").id).toBe("cursor");
    expect(getPlatform(undefined).id).toBe("cursor");
  });
});

describe("normalizeRulePath", () => {
  it("should replace an empty path with rules.md", () => {
    expect(normalizeRulePath("", cursor)).toBe("rules.md");
    expect(normalizeRulePath("   ", cursor)).toBe("rules.md");
  });

  it("should strip platform folders, leading slashes, and known prefixes", () => {
    expect(normalizeRulePath("/.cursor/rules/style.md", cursor)).toBe(
      "style.md",
    );
    expect(
      normalizeRulePath(".cursor/rules/.cursor/rules/stack.md", cursor),
    ).toBe("stack.md");
    expect(normalizeRulePath("rules/testing.md", cursor)).toBe("testing.md");
  });

  it("should drop dot-dot segments instead of resolving them", () => {
    expect(normalizeRulePath("../../etc/passwd", cursor)).toBe("etc/passwd");
    expect(normalizeRulePath("foo/../bar.md", cursor)).toBe("foo/bar.md");
    expect(normalizeRulePath("./style.md", cursor)).toBe("style.md");
  });

  it("should collapse single-file platforms to their canonical name", () => {
    expect(normalizeRulePath("nested/AGENTS.md", codex)).toBe("AGENTS.md");
    expect(normalizeRulePath("docs/.windsurfrules", windsurf)).toBe(
      ".windsurfrules",
    );
    expect(zipFileName(cursor)).toBe("roast-rule-cursor-rules.zip");
  });
});
