"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  InboxIcon,
  MessageSquareIcon,
  ScaleIcon,
  SettingsIcon,
  SunIcon,
} from "lucide-react";
import { DecideView } from "@/components/decide-view";
import { DumpView } from "@/components/dump-view";
import { ReplyView } from "@/components/reply-view";
import { SettingsView } from "@/components/settings-view";
import { TodayView } from "@/components/today-view";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatus } from "@/lib/client-api";
import { applyDumpToLife, dueHabits, ensureDay, localDateKey } from "@/lib/day";
import {
  defaultSettings,
  emptyBoard,
  emptyLife,
  loadBoard,
  loadLife,
  loadSettings,
  saveBoard,
  saveLife,
  saveSettings,
} from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { Board, Life, Settings, TabId } from "@/lib/types";

const TABS: Array<{ id: TabId; label: string; icon: typeof SunIcon }> = [
  { id: "today", label: "Today", icon: SunIcon },
  { id: "dump", label: "Dump", icon: InboxIcon },
  { id: "reply", label: "Reply", icon: MessageSquareIcon },
  { id: "decide", label: "Decide", icon: ScaleIcon },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

const emptySubscribe = () => () => undefined;

export function SortedApp() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [tab, setTab] = useState<TabId>("today");
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [life, setLife] = useState<Life>(emptyLife);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);
  const [hasServerKey, setHasServerKey] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  if (isClient && !hydrated) {
    setHydrated(true);
    setBoard(loadBoard());
    setLife(loadLife());
    setSettings(loadSettings());
    setNow(new Date());
  }

  useEffect(() => {
    if (!hydrated) return;
    void getStatus()
      .then((status) => setHasServerKey(status.hasServerKey))
      .catch(() => setHasServerKey(false));
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, [hydrated]);

  useEffect(() => {
    if (hydrated) saveBoard(board);
  }, [board, hydrated]);

  useEffect(() => {
    if (hydrated) saveLife(life);
  }, [life, hydrated]);

  useEffect(() => {
    if (hydrated) saveSettings(settings);
  }, [settings, hydrated]);

  const hasKey = Boolean(settings.apiKey.trim()) || hasServerKey;
  const todayKey = localDateKey(now ?? new Date());
  const today = ensureDay(life, todayKey);
  const leftoverChecks = hydrated
    ? dueHabits(life, todayKey).filter((habit) => !today.habitDone[habit.id]).length
    : 0;

  function goSettings() {
    setTab("settings");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col md:max-w-3xl md:flex-row md:gap-8 md:px-6">
      <aside className="hidden w-48 shrink-0 pt-10 md:flex md:flex-col md:gap-6">
        <div>
          <p className="font-heading text-2xl italic">Sorted</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Open it in the morning.
            <br />
            Close it at night.
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-label={
                item.id === "today" && leftoverChecks > 0
                  ? `${item.label}, ${leftoverChecks} left`
                  : item.label
              }
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                tab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
              {item.id === "today" && leftoverChecks > 0 ? (
                <span
                  className={cn(
                    "ml-auto rounded-full px-1.5 text-[10px] font-medium",
                    tab === item.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/15 text-primary",
                  )}
                >
                  {leftoverChecks}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 px-4 pt-6 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:px-0 md:pt-10 md:pb-16">
        <div className="mb-6 flex items-center justify-between md:hidden">
          <p className="font-heading text-xl italic">Sorted</p>
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
            {leftoverChecks ? `${leftoverChecks} left today` : "Daily desk"}
          </p>
        </div>

        {!hydrated ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : null}

        {hydrated && tab === "today" ? (
          <TodayView
            board={board}
            onChange={setBoard}
            life={life}
            onLife={setLife}
            settings={settings}
            hasKey={hasKey}
            now={now}
            onDump={() => setTab("dump")}
            onReply={() => setTab("reply")}
            onSettings={goSettings}
          />
        ) : null}

        {hydrated && tab === "dump" ? (
          <DumpView
            board={board}
            settings={settings}
            hasKey={hasKey}
            onOpenSettings={goSettings}
            onAccept={(next, extras) => {
              setBoard(next);
              if (extras.spends.length || extras.dinner) {
                setLife((current) => applyDumpToLife(current, extras));
              }
              setTab("today");
            }}
          />
        ) : null}

        {hydrated && tab === "reply" ? (
          <ReplyView
            board={board}
            settings={settings}
            hasKey={hasKey}
            onOpenSettings={goSettings}
            onSaveDraft={(next) => {
              setBoard(next);
              setTab("today");
            }}
          />
        ) : null}

        {hydrated && tab === "decide" ? (
          <DecideView
            board={board}
            settings={settings}
            hasKey={hasKey}
            onOpenSettings={goSettings}
            onSaveTask={(next) => {
              setBoard(next);
              setTab("today");
            }}
          />
        ) : null}

        {hydrated && tab === "settings" ? (
          <SettingsView
            settings={settings}
            onChange={setSettings}
            hasServerKey={hasServerKey}
            board={board}
            life={life}
            onLife={setLife}
            onClearAll={() => {
              setBoard(emptyBoard());
              setLife(emptyLife());
            }}
          />
        ) : null}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-label={
                item.id === "today" && leftoverChecks > 0
                  ? `${item.label}, ${leftoverChecks} left`
                  : item.label
              }
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[11px]",
                tab === item.id ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
              {item.id === "today" && leftoverChecks > 0 ? (
                <span className="absolute top-1.5 right-[calc(50%-18px)] size-1.5 rounded-full bg-primary" />
              ) : null}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}