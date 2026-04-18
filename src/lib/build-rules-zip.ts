import JSZip from "jszip";
import type { RuleFile } from "@/lib/parse-rules-output";

export async function buildCursorRulesZip(files: RuleFile[]): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder(".cursor");
  if (!root) throw new Error("Could not create .cursor folder in zip");
  const rules = root.folder("rules");
  if (!rules) throw new Error("Could not create rules folder in zip");

  for (const f of files) {
    const normalized = f.path.replace(/^\/+/, "");
    rules.file(normalized, f.content);
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
