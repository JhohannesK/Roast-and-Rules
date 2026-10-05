# Roast & Rule

Next.js app that **roasts** your code (constructively) and **generates** editor rules as Markdown — streamed with the [Vercel AI SDK](https://sdk.vercel.ai/docs) and **Anthropic Claude**.

## Features

- 🔥 **Roast** — a hilarious, still-constructive critique with an improved code sample. Dial it from *Mild* to *Nuclear* with the roast level slider (it tunes the model temperature).
- 📐 **Rules for your editor** — generate rules in **Cursor** (`.cursor/rules/*.md`), **Claude Code** (`.claude/rules/*.md`), **Windsurf** (`.windsurfrules`), or **Codex** (`AGENTS.md`) formats, parsed into individual files as they stream.
- 🐙 **GitHub repo input** — paste `owner/repo` or a full repo URL and the app fetches the repo's file tree + text contents (up to 40 files) to roast and write rules for the whole codebase.
- 🧠 **Language detection** — client-side heuristic (`src/lib/detect-language.ts`) on pasted text or the first 3 repo files. The label is sent to **`/api/roast` only**, not `/api/rules`.
- ✏️ **Edit before you download** — tweak any generated rule file inline, then download the fixed rules as a ZIP (`buildRulesZip` in `src/lib/build-rules-zip.ts`).
- 🕘 **History** — last 20 runs in `localStorage` (`rnr-history`); load, delete, or re-run. Load restores `repoUrl` but **not** fetched repo files. Draft autosaves to `rnr-draft` (400 ms debounce).
- 🎨 One-click copy for the roast and individual rule files, plus one-click demo presets.

## Setup

1. Create an API key in the [Anthropic Console](https://console.anthropic.com/settings/keys).
2. Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`.
3. Optional:
   - `ANTHROPIC_MODEL` (default: `claude-sonnet-4-6`). Must be the Messages API id, not `anthropic/...` (AI Gateway form). See [Anthropic pricing](https://www.anthropic.com/pricing).
   - `GITHUB_TOKEN` — raises the GitHub REST rate limit (anonymous is 60 req/hour per IP) and is **required to load private repos** (otherwise `/api/repo` returns 404).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production notes

- Route handlers use `maxDuration` for long generations on Vercel (`/api/roast`, `/api/rules`: 120s; `/api/repo`: 60s).
- `ANTHROPIC_MODEL` must be the Messages API id (`claude-sonnet-4-6`), not `anthropic/...`. Default is `claude-sonnet-4-6` in `src/lib/ai.ts`.
- Combined Roast + rules fires **two parallel** Anthropic streams (double latency/cost). Either can fail independently.
- Routes are **unauthenticated**. Anyone who can hit the deployment can spend your Anthropic quota.
- History is `localStorage` (`rnr-history`), max **20** entries. Load restores `repoUrl` but **not** fetched files; re-load the repo before re-running.
- For edgy “roast” copy, the model may occasionally refuse; lower the roast slider or rephrase the input.

## Roast level (UI 58 vs API 50)

| Surface | Default if omitted |
|---------|--------------------|
| UI slider / `useState` | **58** |
| History / draft fallback | **58** |
| `POST /api/roast` body | **50** (clamped 0–100) |

Direct API callers that omit `roastLevel` get 50. The UI always sends the slider value. Tone buckets in `roastTone()`: ≤33 Mild, ≤66 Spicy, else Nuclear. Temperature is `0.55 + (roastLevel / 100) * 0.45`.

## API contract

All three handlers live under `src/app/api/*/route.ts`. Errors are JSON `{ error: string }`. Success for roast/rules is a **plain text stream** (`toTextStreamResponse()`), not JSON.

### `POST /api/roast` (`maxDuration` 120)

Body:

```json
{ "input": "string", "roastLevel": 58, "language": "TypeScript", "files": [{ "path": "src/a.ts", "content": "..." }] }
```

`input` and `files` are both optional but **at least one** must be non-empty. `language` is truncated to 40 chars.

Markdown the model is instructed to emit: `## The roast`, `## What actually hurts`, `## Improved version`, `## Why this is better`.

| Status | When |
|--------|------|
| 400 | Invalid JSON, or neither input nor files |
| 500 | Missing `ANTHROPIC_API_KEY` |

### `POST /api/rules` (`maxDuration` 120)

Body:

```json
{ "input": "string", "platform": "cursor", "files": [{ "path": "src/a.ts", "content": "..." }] }
```

`platform`: `cursor` \| `claude` \| `windsurf` \| `codex`. Unknown strings are still passed through; `getPlatform()` **falls back to Cursor**. Temperature is fixed at `0.4`.

Streamed wire format (parsed by `src/lib/parse-rules-output.ts`):

```
<<<FILE file-name.md>>>
(file content)
<<<END FILE>>>
```

ZIP layout: Cursor `.cursor/rules/`, Claude `.claude/rules/`, Windsurf `.windsurfrules`, Codex `AGENTS.md`. Download name: `roast-rule-{platform}-rules.zip`.

| Status | When |
|--------|------|
| 400 | Invalid JSON, or neither input nor files |
| 500 | Missing `ANTHROPIC_API_KEY` |

### `POST /api/repo` (`maxDuration` 60)

Does **not** need `ANTHROPIC_API_KEY`. Accepts `owner/repo`, `https://github.com/owner/repo`, or `git@github.com:owner/repo`.

Body: `{ "url": "owner/repo" }`

Success JSON: `{ owner, repo, branch, files: [{ path, content }], truncated }`.

| Cap | Value |
|-----|-------|
| Files selected | 40 |
| Blob size (tree metadata) | 250 KB |
| Chars per file after fetch | 6,000 |
| Total chars | 180,000 |
| GitHub API timeout | 15s |
| Raw content timeout | 10s |

Skipped: `node_modules`, `.git`, `.next`, `dist`, `build`, `.github`, lockfiles, binaries, `.min.js` / `.min.css`. Tree is GitHub REST (2 calls); contents come from `raw.githubusercontent.com`. UI shows `(truncated)` when the tree was cut.

Roast/rules then re-cap via `sanitizeFiles` (60 files, 8k chars/file, 240k total) in `src/lib/format-input.ts`.

| Status | When |
|--------|------|
| 400 | Invalid JSON / unparseable URL |
| 404 | Repo not found **or private** (no/`GITHUB_TOKEN` without access) |
| 422 | No readable text files |
| 502 | GitHub unreachable, tree fetch failed, or GitHub 403 (rate limit — add `GITHUB_TOKEN`) |
