import type { InputFile } from "@/lib/format-input";

export const maxDuration = 60;

const MAX_FILES = 40;
const MAX_FILE_BYTES = 250_000;
const MAX_FILE_CHARS = 6_000;
const MAX_TOTAL_CHARS = 180_000;

const SKIP_DIRS = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  ".vercel",
  "vendor",
  ".venv",
  "venv",
  "__pycache__",
  "coverage",
  ".cache",
  ".turbo",
  ".idea",
  ".vscode",
  ".github",
  "target",
];

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "avif", "bmp",
  "pdf", "zip", "gz", "tar", "rar", "7z", "bz2", "xz", "zst",
  "mp3", "mp4", "mov", "avi", "mkv", "wav", "ogg", "flac",
  "woff", "woff2", "ttf", "otf", "eot",
  "db", "sqlite", "sqlite3", "class", "jar", "pyc", "pyo", "pyd", "so", "dll", "dylib", "exe",
  "lock", "wasm", "map",
]);

const LOCKFILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "bun.lock",
  "poetry.lock",
  "composer.lock",
  "Gemfile.lock",
  "Cargo.lock",
  "go.sum",
  "deno.lock",
]);

const PRIORITY_EXTENSIONS = [
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "go", "rs", "rb", "php",
  "java", "c", "h", "cpp", "hpp", "cs", "swift", "kt", "kts", "sql",
  "md", "json", "yml", "yaml", "toml", "prisma", "graphql", "proto",
  "css", "scss", "sass", "html", "htm", "vue", "svelte", "sh", "zsh", "bash",
  "env", "example", "ini", "cfg", "conf", "xml", "txt",
];

type GitHubTreeItem = {
  path: string;
  type: string;
  size: number;
};

function parseGitHubRepo(input: string): { owner: string; repo: string } | null {
  const s = input.trim().replace(/\.git$/i, "");
  if (!s) return null;

  const ssh = /^(?:git@|ssh:\/\/git@)([\w.-]+):([\w.-]+)\/([\w.-]+)$/i.exec(s);
  if (ssh) {
    if (ssh[1].toLowerCase() !== "github.com") return null;
    return { owner: ssh[2], repo: ssh[3] };
  }

  const https =
    /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)(?:\/.*)?$/i.exec(
      s,
    );
  if (https) return { owner: https[1], repo: https[2] };

  const bare = /^([\w.-]+)\/([\w.-]+)$/.exec(s);
  if (bare) return { owner: bare[1], repo: bare[2] };

  return null;
}

function isSkippable(path: string, size: number): boolean {
  const lower = path.toLowerCase();
  if (size > MAX_FILE_BYTES) return true;

  const parts = lower.split("/");
  if (parts.some((p) => SKIP_DIRS.includes(p))) return true;

  const base = parts[parts.length - 1];
  if (LOCKFILES.has(base)) return true;
  if (base.endsWith(".min.js") || base.endsWith(".min.css")) return true;

  const dot = base.lastIndexOf(".");
  if (dot === -1) {
    return !/^(dockerfile|makefile|justfile|agents\.md|claude\.md|procfile|\.env.*)$/i.test(
      base,
    );
  }
  const ext = base.slice(dot + 1).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) return true;
  if (ext.length > 8) return true;
  return false;
}

function priority(path: string): number {
  const lower = path.toLowerCase();
  const base = lower.split("/").pop() ?? "";
  if (/^(dockerfile|makefile|justfile|agents\.md|claude\.md|procfile|\.env.*)$/.test(base)) return 0;
  const dot = base.lastIndexOf(".");
  const ext = dot === -1 ? "" : base.slice(dot + 1);
  const idx = PRIORITY_EXTENSIONS.indexOf(ext);
  return idx === -1 ? PRIORITY_EXTENSIONS.length : idx;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 15_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "roast-and-rule",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function POST(req: Request) {
  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const url = typeof body.url === "string" ? body.url : "";
  const parsed = parseGitHubRepo(url);
  if (!parsed) {
    return new Response(
      JSON.stringify({
        error:
          "Couldn't parse that as a GitHub repo. Try owner/repo or a full github.com URL.",
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const { owner, repo } = parsed;
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

  let metaRes: Response;
  try {
    metaRes = await fetchWithTimeout(apiBase, { headers: githubHeaders() });
  } catch {
    return new Response(
      JSON.stringify({ error: "Could not reach the GitHub API." }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  if (metaRes.status === 404) {
    return new Response(
      JSON.stringify({ error: `Repo "${owner}/${repo}" not found or private.` }),
      { status: 404, headers: { "content-type": "application/json" } },
    );
  }
  if (!metaRes.ok) {
    return new Response(
      JSON.stringify({
        error: `GitHub API error ${metaRes.status}. ${metaRes.status === 403 ? "Rate limited — add a GITHUB_TOKEN to raise limits." : ""}`,
      }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  const meta = (await metaRes.json()) as { default_branch?: string };
  const branch = meta.default_branch ?? "main";

  let treeRes: Response;
  try {
    treeRes = await fetchWithTimeout(
      `${apiBase}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      { headers: githubHeaders() },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Could not fetch the repo tree." }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  if (!treeRes.ok) {
    return new Response(
      JSON.stringify({ error: `Could not fetch repo tree (${treeRes.status}).` }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  const treeData = (await treeRes.json()) as { tree?: GitHubTreeItem[] };
  const candidates = (treeData.tree ?? [])
    .filter((item) => item.type === "blob")
    .filter((item) => !isSkippable(item.path, item.size))
    .sort((a, b) => priority(a.path) - priority(b.path) || a.path.localeCompare(b.path));

  const selected = candidates.slice(0, MAX_FILES);

  const files: InputFile[] = [];
  let totalChars = 0;
  let truncated = false;

  for (const item of selected) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`;
    try {
      const res = await fetchWithTimeout(rawUrl, {}, 10_000);
      if (!res.ok) continue;
      const text = await res.text();
      const content = text.slice(0, MAX_FILE_CHARS);
      if (totalChars + content.length > MAX_TOTAL_CHARS) {
        truncated = true;
        continue;
      }
      totalChars += content.length;
      files.push({ path: item.path, content });
    } catch {
      // Skip files that fail to fetch; the tree itself is the useful part.
      truncated = true;
    }
  }

  if (files.length === 0) {
    return new Response(
      JSON.stringify({
        error: "No readable text files found in that repo.",
      }),
      { status: 422, headers: { "content-type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      owner,
      repo,
      branch,
      files,
      truncated,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
