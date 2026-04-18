export type RuleFile = { path: string; content: string };

const END_MARKER = "<<<END FILE>>>";

/**
 * Incrementally parse streamed rules output. Paths are relative to `.cursor/rules/`.
 */
export function extractRuleFilesFromBuffer(buffer: string): {
  files: RuleFile[];
  pending: string;
} {
  const files: RuleFile[] = [];
  let i = 0;

  while (i < buffer.length) {
    const start = buffer.indexOf("<<<FILE", i);
    if (start === -1) {
      return { files, pending: buffer.slice(i) };
    }

    const slice = buffer.slice(start);
    const pathMatch = slice.match(/^<<<FILE\s+(.+?)>>>\s*\n/);
    if (!pathMatch) {
      return { files, pending: buffer.slice(start) };
    }

    const path = pathMatch[1].trim();
    const contentStart = start + pathMatch[0].length;
    const end = buffer.indexOf(END_MARKER, contentStart);
    if (end === -1) {
      return { files, pending: buffer.slice(start) };
    }

    const content = buffer.slice(contentStart, end).replace(/\r\n/g, "\n").trimEnd();
    files.push({ path, content });
    i = end + END_MARKER.length;
    while (buffer[i] === "\n" || buffer[i] === "\r") i++;
  }

  return { files, pending: "" };
}

/** Later chunks override earlier ones for the same path. */
export function mergeRuleFilesByPathOrdered(files: RuleFile[]): RuleFile[] {
  const map = new Map<string, RuleFile>();
  const order: string[] = [];
  for (const f of files) {
    if (!map.has(f.path)) order.push(f.path);
    map.set(f.path, f);
  }
  return order.map((p) => map.get(p)!);
}
