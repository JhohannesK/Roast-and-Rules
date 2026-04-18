"use client";

import { useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  Combine,
  Download,
  FileCode2,
  Flame,
  Loader2,
  Sparkles,
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
import { buildCursorRulesZip, downloadBlob } from "@/lib/build-rules-zip";
import {
  extractRuleFilesFromBuffer,
  mergeRuleFilesByPathOrdered,
  type RuleFile,
} from "@/lib/parse-rules-output";
import { MarkdownContent } from "@/components/roast-rule/markdown-content";

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

function OutputPanels({
  roastText,
  rulesFiles,
  rulesPending,
  loadingRoast,
  loadingRules,
}: {
  roastText: string;
  rulesFiles: RuleFile[];
  rulesPending: string;
  loadingRoast: boolean;
  loadingRules: boolean;
}) {
  const rulesBody = (
    <div className="space-y-4">
      {rulesFiles.length === 0 && !loadingRules && !rulesPending ? (
        <p className="text-sm text-muted-foreground">
          Generate rules to see multiple `.cursor/rules/*.md` files here.
        </p>
      ) : null}
      {rulesFiles.map((f) => (
        <div
          key={f.path}
          className="rounded-xl bg-muted/25 p-3 shadow-[inset_0_1px_0_0_oklch(1_0_0/6%)] ring-1 ring-white/[0.06]"
        >
          <p className="mb-2 font-mono text-xs font-medium text-primary">
            .cursor/rules/{f.path}
          </p>
          <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-950/90 p-3 font-mono text-[0.75rem] leading-relaxed text-zinc-200 ring-1 ring-inset ring-white/[0.04]">
            {f.content}
          </pre>
        </div>
      ))}
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
          Your roast will stream here. Paste code or a project description first.
        </p>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="hidden min-h-[420px] gap-5 lg:grid lg:grid-cols-2">
        <Card className="flex min-h-0 flex-col border-0 bg-gradient-to-b from-card/70 to-card/30 ring-0 shadow-[0_12px_48px_-12px_rgba(0,0,0,0.55)]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="size-4 text-orange-400" />
              Roast
            </CardTitle>
            <CardDescription>Streaming markdown + improved code</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 pt-0">
            <ScrollArea className="h-[min(60vh,520px)] pr-3">
              {roastBody}
            </ScrollArea>
          </CardContent>
        </Card>
        <Card className="flex min-h-0 flex-col border-0 bg-gradient-to-b from-card/70 to-card/30 ring-0 shadow-[0_12px_48px_-12px_rgba(0,0,0,0.55)]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCode2 className="size-4 text-sky-400" />
              Cursor rules
            </CardTitle>
            <CardDescription>
              Parsed files from the model output
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 pt-0">
            <ScrollArea className="h-[min(60vh,520px)] pr-3">
              {rulesBody}
            </ScrollArea>
          </CardContent>
        </Card>
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

export function RoastRuleApp() {
  const [input, setInput] = useState("");
  const [roastLevel, setRoastLevel] = useState([58]);
  const [roastText, setRoastText] = useState("");
  const [rulesRaw, setRulesRaw] = useState("");
  const [rulesFiles, setRulesFiles] = useState<RuleFile[]>([]);
  const [loadingRoast, setLoadingRoast] = useState(false);
  const [loadingRules, setLoadingRules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const level = roastLevel[0] ?? 50;

  async function runRoast(signal?: AbortSignal) {
    setLoadingRoast(true);
    setRoastText("");
    setError(null);
    const res = await fetch("/api/roast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input, roastLevel: level }),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        typeof err.error === "string" ? err.error : `Roast failed (${res.status})`,
      );
    }
    await readTextStream(res, (chunk) => {
      setRoastText((t) => t + chunk);
    }, signal);
  }

  async function runRules(signal?: AbortSignal) {
    setLoadingRules(true);
    setRulesRaw("");
    setRulesFiles([]);
    setError(null);
    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input }),
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
        const { files } = extractRuleFilesFromBuffer(acc);
        setRulesFiles(mergeRuleFilesByPathOrdered(files));
      },
      signal,
    );
  }

  const handleRoastOnly = async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    try {
      await runRoast(signal);
      if (!signal.aborted) fireConfetti(level);
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
      await runRules(signal);
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
      await Promise.all([runRoast(signal), runRules(signal)]);
      if (!signal.aborted) fireConfetti(level);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoadingRoast(false);
      setLoadingRules(false);
    }
  };

  const handleDownloadZip = async () => {
    if (rulesFiles.length === 0) return;
    setZipping(true);
    try {
      const blob = await buildCursorRulesZip(rulesFiles);
      downloadBlob(blob, "roast-rule-cursor-rules.zip");
    } finally {
      setZipping(false);
    }
  };

  const busy = loadingRoast || loadingRules;
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
            Paste code or describe your project. Get a brutal roast plus a full
            set of Cursor rules — streamed live.
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
            Code snippets, repo notes, stack, or anything you want judged.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Textarea
            placeholder="// paste the crime scene&#10;&#10;Or: Next.js app, Postgres, we skip tests, deploy to Vercel…"
            className="min-h-[180px] resize-y border-0 bg-black/25 font-mono text-sm leading-relaxed ring-1 ring-inset ring-white/[0.08] transition-[box-shadow,background-color] duration-200 ease-out placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary/45 md:min-h-[220px]"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />

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
              disabled={busy || !input.trim()}
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
              disabled={busy || !input.trim()}
            >
              {loadingRules ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileCode2 className="size-4" />
              )}
              Generate Cursor rules
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gap-2 bg-primary/12 text-foreground hover:bg-primary/22 sm:flex-1"
              onClick={handleCombined}
              disabled={busy || !input.trim()}
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
            Download full .cursor/rules ZIP
          </Button>
        </div>

        <OutputPanels
          roastText={roastText}
          rulesFiles={rulesFiles}
          rulesPending={rulesPending}
          loadingRoast={loadingRoast}
          loadingRules={loadingRules}
        />
      </section>
    </div>
  );
}
