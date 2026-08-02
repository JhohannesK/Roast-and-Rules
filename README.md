# Roast & Rule

Next.js app that **roasts** your code (constructively) and **generates** editor rules as Markdown — streamed with the [Vercel AI SDK](https://sdk.vercel.ai/docs) and **Anthropic Claude**.

## Features

- 🔥 **Roast** — a hilarious, still-constructive critique with an improved code sample. Dial it from *Mild* to *Nuclear* with the roast level slider (it tunes the model temperature).
- 📐 **Rules for your editor** — generate rules in **Cursor** (`.cursor/rules/*.md`), **Claude Code** (`.claude/rules/*.md`), **Windsurf** (`.windsurfrules`), or **Codex** (`AGENTS.md`) formats, parsed into individual files as they stream.
- 🐙 **GitHub repo input** — paste `owner/repo` or a full repo URL and the app fetches the repo's file tree + text contents (up to 40 files) to roast and write rules for the whole codebase.
- 🧠 **Language detection** — the dominant stack is sniffed from pasted code and passed to the model to tune jokes and rules.
- ✏️ **Edit before you download** — tweak any generated rule file inline, then download the fixed rules as a ZIP (`buildRulesZip` in `src/lib/build-rules-zip.ts`).
- 🕘 **History** — past runs are archived in `localStorage`; load, re-run, or delete them anytime. Your input draft also autosaves across refreshes.
- 🎨 One-click copy for the roast and individual rule files, plus one-click demo presets.

## Setup

1. Create an API key in the [Anthropic Console](https://console.anthropic.com/settings/keys).
2. Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`.
3. Optional:
   - `ANTHROPIC_MODEL` (default: `claude-sonnet-4-6`). See [Anthropic pricing](https://www.anthropic.com/pricing) for rates and limits.
   - `GITHUB_TOKEN` — a fine-grained GitHub token raises the API rate limit when loading repos. Without it, the app uses GitHub's anonymous limit (60 requests/hour per IP).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production notes

- Route handlers use `maxDuration` for long generations on Vercel (`/api/roast`, `/api/rules`: 120s; `/api/repo`: 60s).
- Repo loading uses the GitHub REST API for the tree (2 calls) and `raw.githubusercontent.com` for file contents (not rate-limited by the API).
- For edgy “roast” copy, the model may occasionally refuse; lower the roast slider or rephrase the input.
