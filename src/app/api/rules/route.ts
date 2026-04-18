import { streamText } from "ai";
import { getAnthropicModel } from "@/lib/ai";

export const maxDuration = 120;

const RULES_SYSTEM = `You are an expert staff engineer. Analyze the user's code and/or project description and generate a cohesive set of Cursor project rules as MULTIPLE markdown files.

Output format (STRICT — no prose outside these blocks):
For each file, emit exactly:

<<<FILE relative/path/under/cursor/rules.md>>>
(file content)
<<<END FILE>>>

Rules for each file:
- YAML frontmatter at the top with: title, description, and when relevant \`globs\` and \`alwaysApply\`.
- Use \`alwaysApply: true\` only for small global rules; prefer \`globs\` for stack-specific files.
- \`type\` is not required; use frontmatter fields that help Cursor (description, globs, alwaysApply).
- Cover: coding style, naming, architecture boundaries, stack preferences, testing, and anti-patterns to avoid.
- Use 4–8 separate files with clear names like \`style.md\`, \`architecture.md\`, \`stack.md\`, \`anti-patterns.md\`, \`testing.md\` as appropriate.
- Paths MUST be relative under \`.cursor/rules/\` (e.g. \`typescript.md\` not absolute paths).
- No duplicate filenames. Content must be actionable and specific to the user's input.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing ANTHROPIC_API_KEY" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  let body: { input?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const input = typeof body.input === "string" ? body.input : "";
  if (!input.trim()) {
    return new Response(JSON.stringify({ error: "input is required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const result = streamText({
    model: getAnthropicModel(),
    system: RULES_SYSTEM,
    prompt: `--- User content ---\n${input}`,
    temperature: 0.4,
  });

  return result.toTextStreamResponse();
}
