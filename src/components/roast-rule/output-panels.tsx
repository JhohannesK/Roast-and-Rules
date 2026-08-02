"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  FileCode2,
  Flame,
  Loader2,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { RuleFile } from "@/lib/parse-rules-output";
import { displayRulePath, type Platform } from "@/lib/platforms";
import { MarkdownContent } from "@/components/roast-rule/markdown-content";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

function CopyButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const handle = async () => {
    const ok = await copyText(text);
    if (!ok) return;
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("gap-1.5 text-muted-foreground", className)}
      onClick={handle}
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-400" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function OutputPanels({
  roastText,
  rulesFiles,
  rulesPending,
  loadingRoast,
  loadingRules,
  platform,
  onUpdateRule,
  onResetRule,
}: {
  roastText: string;
  rulesFiles: RuleFile[];
  rulesPending: string;
  loadingRoast: boolean;
  loadingRules: boolean;
  platform: Platform;
  onUpdateRule: (path: string, content: string) => void;
  onResetRule: (path: string) => void;
}) {
  const [editing, setEditing] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // Reset per-file edit state whenever the set of rule files changes
  // (new generation, platform switch, or history load). This uses the
  // documented "adjust state during render" pattern (previous-value guard).
  const pathsKey = rulesFiles.map((f) => f.path).join("\u0000");
  const [prevPathsKey, setPrevPathsKey] = useState(pathsKey);
  if (prevPathsKey !== pathsKey) {
    setPrevPathsKey(pathsKey);
    setEditing(new Set());
    setDrafts({});
  }

  const totalLines = rulesFiles.reduce(
    (acc, f) => acc + f.content.split("\n").length,
    0,
  );
  const statsLabel = `${rulesFiles.length} file${rulesFiles.length === 1 ? "" : "s"} · ${totalLines} line${totalLines === 1 ? "" : "s"}`;

  const copyAll = rulesFiles
    .map((f) => `# ${displayRulePath(f.path, platform)}\n\n${f.content}`)
    .join("\n\n---\n\n");

  const toggleEditing = (path: string) => {
    setEditing((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
        setDrafts((d) => {
          const rest = { ...d };
          delete rest[path];
          return rest;
        });
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const rulesBody = (
    <div className="space-y-4">
      {rulesFiles.length === 0 && !loadingRules && !rulesPending ? (
        <p className="text-sm text-muted-foreground">
          Generate rules to see your {platform.label} rule files here.
        </p>
      ) : null}
      {rulesFiles.map((f) => {
        const isEditing = editing.has(f.path);
        const hasDraft = drafts[f.path] !== undefined;
        const draftContent = hasDraft ? drafts[f.path]! : f.content;
        return (
          <div
            key={f.path}
            className="rounded-xl bg-muted/25 p-3 shadow-[inset_0_1px_0_0_oklch(1_0_0/6%)] ring-1 ring-white/[0.06]"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="truncate font-mono text-xs font-medium text-primary">
                {displayRulePath(f.path, platform)}
              </p>
              <div className="flex shrink-0 items-center gap-1">
                {isEditing ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground"
                      onClick={() => {
                        if (hasDraft) onUpdateRule(f.path, draftContent);
                        toggleEditing(f.path);
                      }}
                    >
                      <Check className="size-3.5 text-emerald-400" />
                      Done
                    </Button>
                    {hasDraft ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground"
                        onClick={() => {
                          setDrafts((d) => {
                            const rest = { ...d };
                            delete rest[f.path];
                            return rest;
                          });
                          onResetRule(f.path);
                        }}
                      >
                        <RotateCcw className="size-3.5" />
                        Reset
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <CopyButton text={f.content} />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                  onClick={() => toggleEditing(f.path)}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              </div>
            </div>
            {isEditing ? (
              <Textarea
                value={draftContent}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [f.path]: e.target.value }))
                }
                className="max-h-72 min-h-40 resize-y overflow-auto rounded-lg bg-zinc-950/90 font-mono text-[0.75rem] leading-relaxed text-zinc-200 ring-1 ring-inset ring-white/[0.04]"
                spellCheck={false}
              />
            ) : (
              <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-950/90 p-3 font-mono text-[0.75rem] leading-relaxed text-zinc-200 ring-1 ring-inset ring-white/[0.04]">
                {f.content}
              </pre>
            )}
          </div>
        );
      })}
      {loadingRules && rulesPending ? (
        <pre className="max-h-32 overflow-auto rounded-lg bg-muted/20 p-3 font-mono text-[0.7rem] text-muted-foreground ring-1 ring-dashed ring-white/[0.08]">
          {rulesPending.slice(-2000)}
        </pre>
      ) : null}
    </div>
  );

  const roastBody = (
    <div className="min-h-[200px]">
      {loadingRoast && !roastText ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Warming up the roast…
        </div>
      ) : null}
      {roastText ? <MarkdownContent content={roastText} /> : null}
      {!loadingRoast && !roastText ? (
        <p className="text-sm text-muted-foreground">
          Your roast will stream here. Paste code or load a repo first.
        </p>
      ) : null}
    </div>
  );

  const roastCard = (
    <Card className="flex min-h-0 flex-col border-0 bg-gradient-to-b from-card/70 to-card/30 ring-0 shadow-[0_12px_48px_-12px_rgba(0,0,0,0.55)]">
      <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="size-4 text-orange-400" />
            Roast
          </CardTitle>
          <CardDescription>Streaming markdown + improved code</CardDescription>
        </div>
        {roastText ? <CopyButton text={roastText} /> : null}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 pt-0">
        <ScrollArea className="h-[min(60vh,520px)] pr-3">{roastBody}</ScrollArea>
      </CardContent>
    </Card>
  );

  const rulesCard = (
    <Card className="flex min-h-0 flex-col border-0 bg-gradient-to-b from-card/70 to-card/30 ring-0 shadow-[0_12px_48px_-12px_rgba(0,0,0,0.55)]">
      <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCode2 className="size-4 text-sky-400" />
            {platform.label} rules
          </CardTitle>
          <CardDescription>
            {rulesFiles.length > 0
              ? `${statsLabel} · edit then download`
              : "Parsed files from the model output"}
          </CardDescription>
        </div>
        {rulesFiles.length > 0 ? <CopyButton text={copyAll} /> : null}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 pt-0">
        <ScrollArea className="h-[min(60vh,520px)] pr-3">{rulesBody}</ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="hidden min-h-[420px] gap-5 lg:grid lg:grid-cols-2">
        {roastCard}
        {rulesCard}
      </div>

      <div className="lg:hidden">
        <Tabs defaultValue="roast" className="w-full">
          <TabsList
            variant="line"
            className="grid h-auto w-full grid-cols-2 justify-stretch gap-0 rounded-none border-b border-white/[0.06] bg-transparent p-0"
          >
            <TabsTrigger value="roast" className="rounded-none border-0 py-3">
              Roast
            </TabsTrigger>
            <TabsTrigger value="rules" className="rounded-none border-0 py-3">
              Rules
            </TabsTrigger>
          </TabsList>
          <TabsContent value="roast" className="mt-4">
            <ScrollArea className="h-[min(55vh,480px)] pr-3">{roastBody}</ScrollArea>
          </TabsContent>
          <TabsContent value="rules" className="mt-4">
            <ScrollArea className="h-[min(55vh,480px)] pr-3">
              {rulesBody}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
