# Roast & Rule

Next.js app that **roasts** your code (constructively) and **generates** editor rules as Markdown — streamed with the [Vercel AI SDK](https://sdk.vercel.ai/docs) and **Anthropic Claude**.

## Features

- 🔥 **Roast** — a hilarious, still-constructive critique with an improved code sample. Dial it from *Mild* to *Nuclear* with the roast level slider (it tunes the model temperature).
- 📐 **Rules for your editor** — generate rules in **Cursor** (`.cursor/rules/*.md`), **Claude Code** (`.claude/rules/*.md`), **Windsurf** (`.windsurfrules`), or **Codex** (`AGENTS.md`) formats, parsed into individual files as they stream.
- 🐙 **GitHub repo input** — paste `owner/repo` or a full repo URL and the app fetches the repo's file tree + text contents (up to 40 files) to roast and write rules for the whole codebase.
- 🧠 **Language detection** — the dominant stack is sniffed from pasted code and passed to the model to tune jokes and rules.
- ✏️ **Edit before you download** — tweak any generated rule file inline, then download the fixed rules as a ZIP (`buildRulesZip` in `src/lib/build-rules-zip.ts`).
- 🕘 **History** — last 20 runs in `localStorage` (`rnr-history`); load, delete, or re-run. Load does not restore fetched repo files. Draft autosaves across refreshes.
- 🎨 One-click copy for the roast and individual rule files, plus one-click demo presets.

## Setup

1. Create an API key in the [Anthropic Console](https://console.anthropic.com/settings/keys).
2. Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`.
3. Optional:
   - `ANTHROPIC_MODEL` (default: `claude-sonnet-4-6`). See [Anthropic pricing](https://www.anthropic.com/pricing) for rates and limits.
   - `GITHUB_TOKEN` — raises the GitHub REST rate limit (anonymous is 60 req/hour per IP) and is **required to load private repos** (otherwise `/api/repo` returns 404).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production notes

- Route handlers use `maxDuration` for long generations on Vercel (`/api/roast`, `/api/rules`: 120s; `/api/repo`: 60s).
- `ANTHROPIC_MODEL` must be the Messages API id (`claude-sonnet-4-6`), not `anthropic/...` (AI Gateway form). Default is `claude-sonnet-4-6` in `src/lib/ai.ts`.
- Combined Roast + rules fires **two parallel** Anthropic streams (double latency/cost). Either can fail independently.
- Routes are **unauthenticated**. Anyone who can hit the deployment can spend your Anthropic quota.
- History is `localStorage` (`rnr-history`), max **20** entries. Load restores `repoUrl` but **not** fetched files; re-load the repo before re-running.
- For edgy “roast” copy, the model may occasionally refuse; lower the roast slider or rephrase the input.

## Repo loading limits (`POST /api/repo`)

Accepts `owner/repo`, `https://github.com/owner/repo`, or `git@github.com:owner/repo`.

| Cap | Value |
|-----|-------|
| Files selected | 40 |
| Blob size (tree metadata) | 250 KB |
| Chars per file after fetch | 6,000 |
| Total chars | 180,000 |
| GitHub API timeout | 15s |
| Raw content timeout | 10s |

Skipped: `node_modules`, `.git`, `.next`, `dist`, `build`, `.github`, lockfiles, binaries, `.min.js` / `.min.css`. UI shows `(truncated)` when the tree was cut. Private repos 404 unless `GITHUB_TOKEN` can read them (token also raises the anonymous 60 req/hour cap).

Roast/rules then re-cap via `sanitizeFiles` (60 files, 8k chars/file, 240k total) in `src/lib/format-input.ts`.

Unknown `platform` values silently fall back to Cursor (`cursor` | `claude` | `windsurf` | `codex`).
