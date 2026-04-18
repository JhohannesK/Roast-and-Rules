# Roast & Rule

Next.js app that **roasts** your code (constructively) and **generates** a `.cursor/rules` tree as Markdown — streamed with the [Vercel AI SDK](https://sdk.vercel.ai/docs) and **Anthropic Claude**.

## Setup

1. Create an API key in the [Anthropic Console](https://console.anthropic.com/settings/keys).
2. Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`.
3. Optional: set `ANTHROPIC_MODEL` (default: `claude-sonnet-4-6`). See [Anthropic pricing](https://www.anthropic.com/pricing) for rates and limits.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production notes

- Route handlers use `maxDuration = 120` for long generations on Vercel.
- For edgy “roast” copy, the model may occasionally refuse; lower the roast slider or rephrase the input.
