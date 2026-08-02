"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  Combine,
  Download,
  FileCode2,
  Flame,
  GitBranch,
  Loader2,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { buildRulesZip, downloadBlob } from "@/lib/build-rules-zip";
import {
  extractRuleFilesFromBuffer,
  mergeRuleFilesByPathOrdered,
  type RuleFile,
} from "@/lib/parse-rules-output";
import { OutputPanels } from "@/components/roast-rule/output-panels";
import { HistoryPanel } from "@/components/roast-rule/history-panel";
import {
  PLATFORMS,
  getPlatform,
  normalizeRulePath,
  type PlatformId,
  zipFileName,
} from "@/lib/platforms";
import { detectLanguage } from "@/lib/detect-language";
import { PRESETS } from "@/lib/presets";
import {
  clearHistory,
  deleteHistoryEntry,
  loadDraft,
  loadHistory,
  saveDraft,
  saveHistoryEntry,
  type HistoryEntry,
} from "@/lib/history";
import type { InputFile } from "@/lib/format-input";
import { cn } from "@/lib/utils";

type SourceMode = "text" | "repo";
type RepoInfo = { owner: string; repo: string; branch: string; truncated: boolean };

function roastLabel(level: number): string {
  if (level <= 33) return "Mild";
  if (level <= 66) return "Spicy";
  return "Nuclear";
}

function fireConfetti(level: number) {
  const t = level / 100;
  const count = Math.floor(36 + t * 140);
  const spread = 52 + t * 48;
  confetti({
    particleCount: count,
    spread,
    startVelocity: 28 + t * 22,
    origin: { y: 0.62 },
    scalar: 0.85 + t * 0.45,
    ticks: 220,
  });
  if (t > 0.55) {
    setTimeout(() => {
      confetti({
        particleCount: Math.floor(count * 0.4),
        spread: spread * 0.8,
        origin: { y: 0.55, x: 0.25 },
      });
    }, 180);
    setTimeout(() => {
      confetti({
        particleCount: Math.floor(count * 0.4),
        spread: spread * 0.8,
        origin: { y: 0.55, x: 0.75 },
      });
    }, 320);
  }
}

async function readTextStream(
  res: Response,
  onChunk: (s: string) => void,
  signal: AbortSignal | undefined,
) {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      return;
    }
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

export function RoastRuleApp() {
  const [input, setInput] = useState("");
  const [roastLevel, setRoastLevel] = useState<number[]>([58]);
  const [platform, setPlatform] = useState<PlatformId>("cursor");
  const [mode, setMode] = useState<SourceMode>("text");

  const [repoUrl, setRepoUrl] = useState("");
  const [repoFiles, setRepoFiles] = useState<InputFile[]>([]);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);

  const [roastText, setRoastText] = useState("");
  const [rulesRaw, setRulesRaw] = useState("");
  const [rulesFiles, setRulesFiles] = useState<RuleFile[]>([]);
  const [rulesOriginals, setRulesOriginals] = useState<Record<string, string>>({});
  const [loadingRoast, setLoadingRoast] = useState(false);
  const [loadingRules, setLoadingRules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  // One-time hydration-safe read of localStorage (history + draft autosave).
  // Deferred a tick to avoid setState-in-effect and SSR/hydration mismatches.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setEntries(loadHistory());
      const draft = loadDraft();
      if (draft) {
        setInput(draft.input);
        setRoastLevel([draft.roastLevel]);
        setPlatform(draft.platform);
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const level = roastLevel[0] ?? 50;
  const runFiles = mode === "repo" && repoFiles.length > 0 ? repoFiles : undefined;

  const language = useMemo(() => {
    if (mode === "repo" && repoFiles.length > 0) {
      const sample = repoFiles
        .slice(0, 3)
        .map((f) => f.content)
        .join("\n");
      return detectLanguage(sample);
    }
    return detectLanguage(input);
  }, [input, mode, repoFiles]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      saveDraft({ input, roastLevel: level, platform });
    }, 400);
    return () => window.clearTimeout(t);
  }, [input, level, platform]);

  async function runRoast(signal?: AbortSignal, files?: InputFile[]): Promise<string> {
    setLoadingRoast(true);
    setRoastText("");
    setError(null);
    const res = await fetch("/api/roast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        input,
        roastLevel: level,
        language: language?.label,
        files,
      }),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        typeof err.error === "string" ? err.error : `Roast failed (${res.status})`,
      );
    }
    let acc = "";
    await readTextStream(res, (chunk) => {
      acc += chunk;
      setRoastText((t) => t + chunk);
    }, signal);
    return acc;
  }

  async function runRules(signal?: AbortSignal, files?: InputFile[]): Promise<RuleFile[]> {
    setLoadingRules(true);
    setRulesRaw("");
    setRulesFiles([]);
    setError(null);
    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input, platform, files }),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        typeof err.error === "string" ? err.error : `Rules failed (${res.status})`,
      );
    }
    let acc = "";
    await readTextStream(
      res,
      (chunk) => {
        acc += chunk;
        setRulesRaw(acc);
        const { files: parsed } = extractRuleFilesFromBuffer(acc);
        setRulesFiles(mergeRuleFilesByPathOrdered(parsed));
      },
      signal,
    );
    const finalFiles = mergeRuleFilesByPathOrdered(
      extractRuleFilesFromBuffer(acc).files,
    );
    setRulesFiles(finalFiles);
    setRulesOriginals(
      Object.fromEntries(finalFiles.map((f) => [f.path, f.content])),
    );
    return finalFiles;
  }

  function persistEntry(
    kind: "roast" | "rules" | "both",
    values: { roastText: string; rulesFiles: RuleFile[] },
  ) {
    const entry: HistoryEntry = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()),
      createdAt: Date.now(),
      input,
      roastLevel: level,
      platform,
      source: runFiles ? "repo" : "text",
      roastText: kind === "roast" || kind === "both" ? values.roastText : "",
      rulesFiles: kind === "rules" || kind === "both" ? values.rulesFiles : [],
      repoUrl: runFiles ? repoUrl : undefined,
      language: language?.label,
    };
    setEntries(saveHistoryEntry(entry));
  }

  const handleRoastOnly = async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    try {
      const result = await runRoast(signal, runFiles);
      if (!signal.aborted) {
        fireConfetti(level);
        persistEntry("roast", { roastText: result, rulesFiles: [] });
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Roast failed");
    } finally {
      setLoadingRoast(false);
    }
  };

  const handleRulesOnly = async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    try {
      const result = await runRules(signal, runFiles);
      if (!signal.aborted) persistEntry("rules", { roastText: "", rulesFiles: result });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Rules failed");
    } finally {
      setLoadingRules(false);
    }
  };

  const handleCombined = async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setError(null);
    setRoastText("");
    setRulesRaw("");
    setRulesFiles([]);
    setLoadingRoast(true);
    setLoadingRules(true);
    try {
      const [roastResult, rulesResult] = await Promise.all([
        runRoast(signal, runFiles),
        runRules(signal, runFiles),
      ]);
      if (!signal.aborted) {
        fireConfetti(level);
        persistEntry("both", {
          roastText: roastResult,
          rulesFiles: rulesResult,
        });
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoadingRoast(false);
      setLoadingRules(false);
    }
  };

  const handleLoadRepo = async () => {
    if (!repoUrl.trim() || loadingRepo) return;
    setLoadingRepo(true);
    setRepoError(null);
    try {
      const res = await fetch("/api/repo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: repoUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Failed to load repo (${res.status})`,
        );
      }
      setRepoFiles(Array.isArray(data.files) ? data.files : []);
      setRepoInfo({
        owner: String(data.owner ?? ""),
        repo: String(data.repo ?? ""),
        branch: String(data.branch ?? "main"),
        truncated: Boolean(data.truncated),
      });
    } catch (e) {
      setRepoError(e instanceof Error ? e.message : "Failed to load repo");
    } finally {
      setLoadingRepo(false);
    }
  };

  const handleDownloadZip = async () => {
    if (rulesFiles.length === 0) return;
    setZipping(true);
    try {
      const platformDef = getPlatform(platform);
      const normalized = rulesFiles.map((f) => ({
        path: normalizeRulePath(f.path, platformDef),
        content: f.content,
      }));
      const blob = await buildRulesZip(normalized, platformDef.zipFolders);
      downloadBlob(blob, zipFileName(platformDef));
    } finally {
      setZipping(false);
    }
  };

  const handlePlatformChange = (id: PlatformId) => {
    setPlatform(id);
    setRulesFiles([]);
    setRulesRaw("");
    setRulesOriginals({});
  };

  const updateRule = (path: string, content: string) => {
    setRulesFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, content } : f)),
    );
  };

  const resetRule = (path: string) => {
    setRulesFiles((prev) =>
      prev.map((f) =>
        f.path === path
          ? { ...f, content: rulesOriginals[path] ?? f.content }
          : f,
      ),
    );
  };

  const handleLoadEntry = (entry: HistoryEntry) => {
    const files = Array.isArray(entry.rulesFiles) ? entry.rulesFiles : [];
    setInput(entry.input ?? "");
    setRoastLevel([Number.isFinite(entry.roastLevel) ? entry.roastLevel : 58]);
    setPlatform(entry.platform);
    setMode(entry.source ?? "text");
    setRepoUrl(entry.repoUrl ?? "");
    setRoastText(typeof entry.roastText === "string" ? entry.roastText : "");
    setRulesRaw("");
    setRulesFiles(files);
    setRulesOriginals(Object.fromEntries(files.map((f) => [f.path, f.content])));
    setError(null);
  };

  const busy = loadingRoast || loadingRules;
  const canRun = mode === "repo" ? repoFiles.length > 0 : input.trim().length > 0;
  const rulesPending =
    loadingRules && rulesRaw
      ? extractRuleFilesFromBuffer(rulesRaw).pending
      : "";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Roast &amp; Rule
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Paste code, describe a project, or load a GitHub repo. Get a brutal
            roast plus a full set of editor rules — streamed live.
          </p>
        </div>
        <Badge
          variant="secondary"
          className="w-fit shrink-0 gap-1.5 border-0 bg-white/[0.05] py-1.5 text-xs font-normal text-muted-foreground shadow-none backdrop-blur-sm"
        >
          <Sparkles className="size-3.5 text-amber-400" />
          Built with Cursor in &lt;4 hours
        </Badge>
      </header>

      <Card className="border-0 bg-gradient-to-b from-card/80 to-muted/15 ring-0 shadow-[0_16px_56px_-16px_rgba(0,0,0,0.6)]">
        <CardHeader>
          <CardTitle className="text-lg">Your input</CardTitle>
          <CardDescription>
            A code snippet, a project description, or a whole GitHub repo —
            whatever you want judged.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs
            value={mode}
            onValueChange={(v) => setMode((v as SourceMode) ?? "text")}
            className="w-full"
          >
            <TabsList
              variant="line"
              className="grid h-auto w-full max-w-xs grid-cols-2 justify-stretch gap-0 rounded-none border-b border-white/[0.06] bg-transparent p-0"
            >
              <TabsTrigger value="text" className="rounded-none border-0 py-2.5">
                Paste code
              </TabsTrigger>
              <TabsTrigger value="repo" className="rounded-none border-0 py-2.5">
                GitHub repo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="mt-4 space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  Try:
                </span>
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setInput(p.content)}
                    disabled={busy}
                    className={cn(
                      "shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-60",
                    )}
                  >
                    <span className="mr-1">{p.emoji}</span>
                    {p.label}
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="// paste the crime scene&#10;&#10;Or: Next.js app, Postgres, we skip tests, deploy to Vercel…"
                className="min-h-[180px] resize-y border-0 bg-black/25 font-mono text-sm leading-relaxed ring-1 ring-inset ring-white/[0.08] transition-[box-shadow,background-color] duration-200 ease-out placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary/45 md:min-h-[220px]"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy}
              />
              {language ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Detected stack:</span>
                  <Badge
                    variant="secondary"
                    className="border-0 bg-emerald-500/10 px-2 py-0.5 text-[0.7rem] font-medium text-emerald-300/90"
                  >
                    {language.label}
                  </Badge>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="repo" className="mt-4 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLoadRepo();
                  }}
                  placeholder="owner/repo or https://github.com/owner/repo"
                  disabled={loadingRepo || busy}
                  className="h-9 w-full flex-1 rounded-lg border border-input bg-transparent px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2"
                  onClick={handleLoadRepo}
                  disabled={loadingRepo || busy || !repoUrl.trim()}
                >
                  {loadingRepo ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <GitBranch className="size-4" />
                  )}
                  {loadingRepo ? "Loading…" : "Load repository"}
                </Button>
              </div>
              {repoError ? (
                <p className="text-sm text-destructive" role="alert">
                  {repoError}
                </p>
              ) : null}
              {repoFiles.length > 0 ? (
                <div className="rounded-xl bg-muted/20 ring-1 ring-inset ring-white/[0.06]">
                  <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
                    <p className="truncate text-xs font-medium text-foreground/80">
                      {repoInfo
                        ? `${repoInfo.owner}/${repoInfo.repo} @ ${repoInfo.branch}`
                        : "Repository"}{" "}
                      · {repoFiles.length} file
                      {repoFiles.length === 1 ? "" : "s"}
                      {repoInfo?.truncated ? " (truncated)" : ""}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="gap-1 text-muted-foreground"
                      onClick={() => {
                        setRepoFiles([]);
                        setRepoInfo(null);
                      }}
                    >
                      <X className="size-3" />
                      Clear
                    </Button>
                  </div>
                  <ScrollArea className="max-h-36 p-3">
                    <ul className="space-y-1 font-mono text-[0.7rem] text-muted-foreground">
                      {repoFiles.slice(0, 30).map((f) => (
                        <li key={f.path} className="truncate">
                          {f.path}
                        </li>
                      ))}
                      {repoFiles.length > 30 ? (
                        <li className="text-muted-foreground/60">
                          …and {repoFiles.length - 30} more
                        </li>
                      ) : null}
                    </ul>
                  </ScrollArea>
                </div>
              ) : null}
              <Textarea
                placeholder="Optional notes — e.g. 'focus rules on the auth module, we hate Redux'"
                className="min-h-[90px] resize-y border-0 bg-black/25 font-mono text-sm leading-relaxed ring-1 ring-inset ring-white/[0.08] transition-[box-shadow,background-color] duration-200 ease-out placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary/45"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy}
              />
              {language ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Detected stack:</span>
                  <Badge
                    variant="secondary"
                    className="border-0 bg-emerald-500/10 px-2 py-0.5 text-[0.7rem] font-medium text-emerald-300/90"
                  >
                    {language.label}
                  </Badge>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>

          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <FileCode2 className="size-4 text-sky-400" />
              Rule format
            </Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const active = platform === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePlatformChange(p.id)}
                    disabled={busy}
                    title={p.description}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition-all disabled:pointer-events-none disabled:opacity-60",
                      active
                        ? "bg-primary/15 text-foreground ring-primary/40"
                        : "bg-white/[0.04] text-muted-foreground ring-transparent hover:bg-white/[0.08] hover:text-foreground",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Zap className="size-4 text-amber-400" />
                Roast level
              </Label>
              <span className="text-sm text-muted-foreground">
                {roastLabel(level)} ({level})
              </span>
            </div>
            <Slider
              value={roastLevel}
              onValueChange={(v) =>
                setRoastLevel(Array.isArray(v) ? [...v] : [v])
              }
              min={0}
              max={100}
              step={1}
              disabled={busy}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Mild</span>
              <span>Nuclear</span>
            </div>
          </div>

          <div
            className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
            aria-hidden
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              className="gap-2 sm:flex-1"
              onClick={handleRoastOnly}
              disabled={busy || !canRun}
            >
              {loadingRoast ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Flame className="size-4" />
              )}
              Roast this code
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gap-2 sm:flex-1"
              onClick={handleRulesOnly}
              disabled={busy || !canRun}
            >
              {loadingRules ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileCode2 className="size-4" />
              )}
              Generate rules
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gap-2 bg-primary/12 text-foreground hover:bg-primary/22 sm:flex-1"
              onClick={handleCombined}
              disabled={busy || !canRun}
            >
              {loadingRoast && loadingRules ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Combine className="size-4" />
              )}
              Roast + rules
            </Button>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Output</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-2 self-start sm:self-auto"
            disabled={rulesFiles.length === 0 || zipping}
            onClick={handleDownloadZip}
          >
            {zipping ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Download {getPlatform(platform).label} rules ZIP
          </Button>
        </div>

        <OutputPanels
          roastText={roastText}
          rulesFiles={rulesFiles}
          rulesPending={rulesPending}
          loadingRoast={loadingRoast}
          loadingRules={loadingRules}
          platform={getPlatform(platform)}
          onUpdateRule={updateRule}
          onResetRule={resetRule}
        />
      </section>

      <HistoryPanel
        entries={entries}
        onLoad={handleLoadEntry}
        onDelete={(id) => setEntries(deleteHistoryEntry(id))}
        onClear={() => setEntries(clearHistory())}
      />
    </div>
  );
}
