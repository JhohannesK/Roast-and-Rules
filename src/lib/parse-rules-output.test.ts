import { describe, expect, it } from "vitest";
import {
  extractRuleFilesFromBuffer,
  mergeRuleFilesByPathOrdered,
} from "@/lib/parse-rules-output";

describe("extractRuleFilesFromBuffer", () => {
  it("should parse a complete file and leave trailing prose as pending", () => {
    const buffer =
      "intro\n<<<FILE style.md>>>\n# Style\nuse const\n<<<END FILE>>>\nmore";
    expect(extractRuleFilesFromBuffer(buffer)).toEqual({
      files: [{ path: "style.md", content: "# Style\nuse const" }],
      pending: "more",
    });
  });

  it("should keep an incomplete marker in pending across chunk boundaries", () => {
    const first = extractRuleFilesFromBuffer(
      "<<<FILE arch.md>>>\npartial body",
    );
    expect(first.files).toEqual([]);
    expect(first.pending).toBe("<<<FILE arch.md>>>\npartial body");

    const second = extractRuleFilesFromBuffer(
      first.pending + "\nrest\n<<<END FILE>>>\n",
    );
    expect(second.files).toEqual([
      { path: "arch.md", content: "partial body\nrest" },
    ]);
    expect(second.pending).toBe("");
  });

  it("should normalize CRLF and parse multiple files in one buffer", () => {
    const buffer =
      "<<<FILE a.md>>>\r\nline a\r\n<<<END FILE>>>\r\n<<<FILE b.md>>>\r\nline b\r\n<<<END FILE>>>";
    expect(extractRuleFilesFromBuffer(buffer)).toEqual({
      files: [
        { path: "a.md", content: "line a" },
        { path: "b.md", content: "line b" },
      ],
      pending: "",
    });
  });

  it("should treat a malformed FILE header as pending", () => {
    const buffer = "<<<FILE no-close";
    expect(extractRuleFilesFromBuffer(buffer)).toEqual({
      files: [],
      pending: "<<<FILE no-close",
    });
  });
});

describe("mergeRuleFilesByPathOrdered", () => {
  it("should keep first-seen order and let later chunks win the same path", () => {
    expect(
      mergeRuleFilesByPathOrdered([
        { path: "a.md", content: "first-a" },
        { path: "b.md", content: "b" },
        { path: "a.md", content: "second-a" },
      ]),
    ).toEqual([
      { path: "a.md", content: "second-a" },
      { path: "b.md", content: "b" },
    ]);
  });
});
