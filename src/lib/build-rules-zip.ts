import JSZip from "jszip";
import type { RuleFile } from "@/lib/parse-rules-output";

/**
 * Build a ZIP containing the given rule files. `folders` is the nested
 * directory layout to place them under, e.g. [".cursor", "rules"] for Cursor
 * or [] to place files at the ZIP root (Windsurf/Codex single files).
 */
export async function buildRulesZip(
  files: RuleFile[],
  folders: string[] = [],
): Promise<Blob> {
  const zip = new JSZip();
  let target = zip;
  for (const folder of folders) {
    const next = target.folder(folder);
    if (!next) throw new Error(`Could not create "${folder}" folder in zip`);
    target = next;
  }

  for (const f of files) {
    const normalized = f.path.replace(/^\/+/, "");
    target.file(normalized, f.content);
  }

  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
