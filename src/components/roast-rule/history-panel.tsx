"use client";

import { useState } from "react";
import { History, RotateCcw, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getPlatform } from "@/lib/platforms";
import type { HistoryEntry } from "@/lib/history";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function HistoryPanel({
  entries,
  onLoad,
  onDelete,
  onClear,
}: {
  entries: HistoryEntry[];
  onLoad: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="group flex items-center gap-2 text-sm font-semibold text-foreground/80 transition-colors hover:text-foreground"
        >
          <History className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
          History
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
            {entries.length}
          </span>
          <span
            className={`text-xs text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          >
            ›
          </span>
        </button>
        {entries.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={onClear}
          >
            <X className="size-3.5" />
            Clear all
          </Button>
        ) : null}
      </div>

      {open ? (
        <ScrollArea className="max-h-72 rounded-xl bg-muted/15 ring-1 ring-inset ring-white/[0.06]">
          {entries.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No runs saved yet — roasts and rules are archived here
              automatically.
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-foreground/85">
                      {e.input.trim().split("\n")[0] || "(empty)"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-[0.7rem] text-muted-foreground">
                        {timeAgo(e.createdAt)}
                      </span>
                      <Badge
                        variant="secondary"
                        className="border-0 bg-white/[0.06] px-1.5 py-0 text-[0.65rem] font-normal text-muted-foreground"
                      >
                        {getPlatform(e.platform).label}
                      </Badge>
                      {e.source === "repo" ? (
                        <Badge
                          variant="secondary"
                          className="border-0 bg-white/[0.06] px-1.5 py-0 text-[0.65rem] font-normal text-muted-foreground"
                        >
                          repo
                        </Badge>
                      ) : null}
                      {e.roastText ? (
                        <Badge
                          variant="secondary"
                          className="border-0 bg-orange-500/10 px-1.5 py-0 text-[0.65rem] font-normal text-orange-300/80"
                        >
                          roast
                        </Badge>
                      ) : null}
                      {e.rulesFiles.length > 0 ? (
                        <Badge
                          variant="secondary"
                          className="border-0 bg-sky-500/10 px-1.5 py-0 text-[0.65rem] font-normal text-sky-300/80"
                        >
                          {e.rulesFiles.length} rules
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground"
                      onClick={() => onLoad(e)}
                    >
                      <RotateCcw className="size-3.5" />
                      Load
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      onClick={() => onDelete(e.id)}
                      aria-label="Delete entry"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      ) : null}
    </section>
  );
}
