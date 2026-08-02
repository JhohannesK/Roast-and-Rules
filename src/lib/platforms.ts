export type PlatformId = "cursor" | "claude" | "windsurf" | "codex";

export type Platform = {
  id: PlatformId;
  label: string;
  description: string;
  /** Nested folders the emitted files land under inside the ZIP (e.g. [".cursor", "rules"]). */
  zipFolders: string[];
  /** Human-readable prefix shown in the UI next to each rule file. */
  displayPrefix: string;
  /** Format-specific instructions the model must follow (embedded into the rules system prompt). */
  systemRules: string;
};

export const PLATFORMS: Platform[] = [
  {
    id: "cursor",
    label: "Cursor",
    description: ".cursor/rules/*.md with YAML frontmatter",
    zipFolders: [".cursor", "rules"],
    displayPrefix: ".cursor/rules/",
    systemRules: `Generate Cursor project rules as MULTIPLE markdown files.
Output format (STRICT — no prose outside these blocks):
For each file, emit exactly:

<<<FILE file-name.md>>>
(file content)
<<<END FILE>>>

Per-file rules:
- YAML frontmatter at the top with: title, description, and when relevant \`globs\` and \`alwaysApply\`.
- Use \`alwaysApply: true\` only for small global rules; prefer \`globs\` for stack-specific files.
- Use 4–8 separate files with clear names like \`style.md\`, \`architecture.md\`, \`stack.md\`, \`anti-patterns.md\`, \`testing.md\` as appropriate.
- Emit paths WITHOUT any \`.cursor/rules/\` prefix (e.g. \`typescript.md\`, not absolute paths).`,
  },
  {
    id: "claude",
    label: "Claude Code",
    description: ".claude/rules/*.md with YAML frontmatter",
    zipFolders: [".claude", "rules"],
    displayPrefix: ".claude/rules/",
    systemRules: `Generate Claude Code project rules as MULTIPLE markdown files for the \`.claude/rules/\` directory.
Output format (STRICT — no prose outside these blocks):
For each file, emit exactly:

<<<FILE file-name.md>>>
(file content)
<<<END FILE>>>

Per-file rules:
- YAML frontmatter at the top: \`description\` (required, one line), and optionally \`globs\` (comma-separated) and \`alwaysApply\` (true/false).
- Use 3–6 files with clear names like \`style.md\`, \`architecture.md\`, \`testing.md\`, \`anti-patterns.md\`.
- Emit paths WITHOUT any \`.claude/rules/\` prefix (e.g. \`style.md\`).`,
  },
  {
    id: "windsurf",
    label: "Windsurf",
    description: "Single .windsurfrules file",
    zipFolders: [],
    displayPrefix: "",
    systemRules: `Generate Windsurf project rules as a SINGLE file. Windsurf uses one \`.windsurfrules\` file at the repo root containing markdown organized with \`# Section\` headings (e.g. \`# Global Rules\`, \`# Code Style\`, \`# Architecture\`, \`# Testing\`, \`# Anti-patterns\`).
Output format (STRICT — no prose outside these blocks):
Emit exactly one file:

<<<FILE .windsurfrules>>>
(file content)
<<<END FILE>>>

Per-file rules:
- Organized with \`# Section\` headings, concise and actionable.`,
  },
  {
    id: "codex",
    label: "Codex",
    description: "Single AGENTS.md file",
    zipFolders: [],
    displayPrefix: "",
    systemRules: `Generate OpenAI Codex project rules as a SINGLE \`AGENTS.md\` file at the repo root.
Output format (STRICT — no prose outside these blocks):
Emit exactly one file:

<<<FILE AGENTS.md>>>
(file content)
<<<END FILE>>>

Per-file rules:
- Plain markdown organized with \`## Section\` headings (e.g. \`## Commands\`, \`## Code style\`, \`## Architecture\`, \`## Testing\`, \`## Anti-patterns\`).
- Start with a one-paragraph "What this repo is" overview.
- Concise and actionable.`,
  },
];

export const PLATFORM_IDS: PlatformId[] = PLATFORMS.map((p) => p.id);

export function getPlatform(id: string | undefined): Platform {
  return (
    PLATFORMS.find((p) => p.id === id) ??
    PLATFORMS.find((p) => p.id === "cursor")!
  );
}

/**
 * Normalize a path emitted by the model so it sits cleanly under the
 * platform's zip folders (or at the root for single-file platforms).
 */
export function normalizeRulePath(path: string, platform: Platform): string {
  let p = path.replace(/^\/+/, "").trim();
  if (!p) return "rules.md";

  // Repeatedly strip leading segments that match the platform's own folders.
  const segments = [...platform.zipFolders].reverse();
  let changed = true;
  while (changed) {
    changed = false;
    for (const seg of segments) {
      if (p.startsWith(`${seg}/`)) {
        p = p.slice(seg.length + 1);
        changed = true;
      }
    }
  }

  // Strip accidental absolute-ish prefixes for any known layout.
  for (const pre of [
    ".cursor/rules/",
    ".claude/rules/",
    "windsurf/rules/",
    ".windsurf/rules/",
    "rules/",
  ]) {
    if (p.startsWith(pre)) {
      p = p.slice(pre.length);
      break;
    }
  }

  // Single-file platforms always collapse to their canonical filename.
  if (platform.id === "codex" && /(^|\/)AGENTS\.md$/i.test(p)) {
    p = "AGENTS.md";
  }
  if (platform.id === "windsurf") {
    const m = /(^|\/)(\.?windsurfrules)$/i.exec(p);
    if (m) p = ".windsurfrules";
  }

  // Drop empty, ".", and ".." segments so model output can't escape the zip root.
  return p
    .split("/")
    .filter((seg) => seg && seg !== "." && seg !== "..")
    .join("/");
}

/** Full path shown in the UI, e.g. ".cursor/rules/style.md". */
export function displayRulePath(path: string, platform: Platform): string {
  return `${platform.displayPrefix}${normalizeRulePath(path, platform)}`;
}

/** Filename used for the downloaded ZIP, e.g. "roast-rule-cursor-rules.zip". */
export function zipFileName(platform: Platform): string {
  return `roast-rule-${platform.id}-rules.zip`;
}
