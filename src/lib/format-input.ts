export type InputFile = {
  path: string;
  content: string;
};

/**
 * Build the user-facing prompt content shared by the roast and rules routes.
 * Includes a repository file tree + truncated contents when files are present,
 * plus free-form user notes/description.
 */
export function formatUserContent(input: string, files?: InputFile[]): string {
  const parts: string[] = [];

  if (files && files.length > 0) {
    const tree = files.map((f) => f.path).join("\n");
    parts.push(`--- Repository file tree ---\n${tree}`);
    parts.push(
      "--- Repository file contents (truncated) ---\n" +
        files
          .map((f) => `======== ${f.path} ========\n${f.content}`)
          .join("\n\n"),
    );
  }

  const trimmed = input.trim();
  if (trimmed) {
    parts.push(`--- User notes / description ---\n${trimmed}`);
  }

  return parts.join("\n\n");
}

export const MAX_INPUT_FILES = 60;
export const MAX_INPUT_FILE_CHARS = 8_000;
export const MAX_INPUT_TOTAL_CHARS = 240_000;

/** Validate + cap client-supplied file lists before they reach the prompt. */
export function sanitizeFiles(raw: unknown): InputFile[] | null {
  if (!Array.isArray(raw)) return null;
  const out: InputFile[] = [];
  let total = 0;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const path =
      typeof (item as { path?: unknown }).path === "string"
        ? (item as { path: string }).path.trim()
        : "";
    const content =
      typeof (item as { content?: unknown }).content === "string"
        ? (item as { content: string }).content
        : "";
    if (!path || !content) continue;
    if (out.length >= MAX_INPUT_FILES) break;
    const c = content.slice(0, MAX_INPUT_FILE_CHARS);
    total += c.length;
    if (total > MAX_INPUT_TOTAL_CHARS) break;
    out.push({ path, content: c });
  }
  return out.length > 0 ? out : null;
}
