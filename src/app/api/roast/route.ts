import { streamText } from "ai";
import { getAnthropicModel } from "@/lib/ai";
import { formatUserContent, sanitizeFiles } from "@/lib/format-input";

export const maxDuration = 120;

function roastTone(level: number): string {
  if (level <= 33) {
    return "Mild: gentle teasing, dad-joke energy, still sharp observations.";
  }
  if (level <= 66) {
    return "Spicy: clever burns, memorable one-liners, call out real issues.";
  }
  return "Nuclear: savage comedy roast energy — still never cruel about protected traits; punch up at the code, not people.";
}

const ROAST_SYSTEM = `You are a senior engineer and roast comic. Deliver a hilarious, memorable critique that is still constructive and actionable.
Rules:
- Roast the CODE or ARCHITECTURE, not protected classes of people.
- No slurs, hate, harassment, or genuinely harmful content.
- Stay funny: exaggeration, metaphors, callbacks — but end with real help.
- Always include an improved code sample when the input contains code; if it's prose-only, give pseudocode or a minimal example that illustrates the fix.
Output MUST use this markdown structure:

## The roast
...

## What actually hurts
- bullet points

## Improved version
\`\`\`lang
...
\`\`\`

## Why this is better
- short bullets
`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing ANTHROPIC_API_KEY" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  let body: {
    input?: unknown;
    roastLevel?: unknown;
    language?: unknown;
    files?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const input = typeof body.input === "string" ? body.input : "";
  const roastLevel =
    typeof body.roastLevel === "number" && Number.isFinite(body.roastLevel)
      ? Math.min(100, Math.max(0, body.roastLevel))
      : 50;
  const language =
    typeof body.language === "string" ? body.language.slice(0, 40).trim() : "";
  const files = sanitizeFiles(body.files);

  if (!input.trim() && !files) {
    return new Response(
      JSON.stringify({ error: "input or files are required" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const tone = roastTone(roastLevel);
  const temperature = 0.55 + (roastLevel / 100) * 0.45;

  const hints: string[] = [];
  hints.push(`Roast level slider: ${roastLevel}/100.`);
  hints.push(`Tone: ${tone}`);
  if (language) hints.push(`Detected language: ${language} — lean into jokes about that stack.`);

  const result = streamText({
    model: getAnthropicModel(),
    system: ROAST_SYSTEM,
    prompt: `${hints.join("\n")}\n\n--- User content ---\n${formatUserContent(input, files ?? undefined)}`,
    temperature,
  });

  return result.toTextStreamResponse();
}
