import { streamText } from "ai";
import { getAnthropicModel } from "@/lib/ai";
import { getPlatform, type PlatformId } from "@/lib/platforms";
import { formatUserContent, sanitizeFiles } from "@/lib/format-input";

export const maxDuration = 120;

function rulesSystem(platformId: PlatformId): string {
  const platform = getPlatform(platformId);
  return `You are an expert staff engineer. Analyze the user's code and/or project description and generate a cohesive set of ${platform.label} project rules.

${platform.systemRules}

Rules for all files:
- Cover: coding style, naming, architecture boundaries, stack preferences, testing, and anti-patterns to avoid.
- No duplicate filenames. Content must be actionable and specific to the user's input.
- Output ONLY the <<<FILE ... >>> / <<<END FILE>>> blocks — no prose before, between, or after them.`;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing ANTHROPIC_API_KEY" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  let body: { input?: unknown; platform?: unknown; files?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const input = typeof body.input === "string" ? body.input : "";
  const platform =
    typeof body.platform === "string"
      ? (body.platform as PlatformId)
      : "cursor";
  const files = sanitizeFiles(body.files);

  if (!input.trim() && !files) {
    return new Response(
      JSON.stringify({ error: "input or files are required" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const result = streamText({
    model: getAnthropicModel(),
    system: rulesSystem(platform),
    prompt: formatUserContent(input, files ?? undefined),
    temperature: 0.4,
  });

  return result.toTextStreamResponse();
}
