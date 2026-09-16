"use client";

import { useMemo, useState } from "react";
import {
  CalendarIcon,
  CheckIcon,
  ChefHatIcon,
  PlusIcon,
  StickyNoteIcon,
  Trash2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { Input } from "@/components/ui/input";
import { postJson, UNAVAILABLE } from "@/lib/client-api";
import {
  dayPhase,
  dueHabits,
  ensureDay,
  formatMoney,
  isoToLocalDateKey,
  localDateKey,
  localWrap,
  shiftDateKey,
  spendTotal,
  streakCount,
  upsertDay,
  weekStrip,
} from "@/lib/day";
import { dinnerFromGroceries } from "@/lib/dinner-heuristic";
import { createId } from "@/lib/ids";
import { downloadIcs } from "@/lib/ics";
import { guessKind, parseAmountOnly, parseSpend, type QuickKind } from "@/lib/parse-quick";
import type {
  Board,
  DayBrief,
  DayDinner,
  DayWrap,
  Life,
  Priority,
  Settings,
  Spend,
  Task,
} from "@/lib/types";

const PRIORITY_LABEL: Record<Priority, string> = {
  now: "Now",
  today: "Today",
  later: "Later",
};

export function TodayView({
  board,
  onChange,
  life,
  onLife,
  settings,
  canUseModel,
  now,
  onDump,
  onReply,
  onSettings,
}: {
  board: Board;
  onChange: (board: Board) => void;
  life: Life;
  onLife: (life: Life) => void;
  settings: Settings;
  canUseModel: boolean;
  now: Date | null;
  onDump: () => void;
  onReply: () => void;
  onSettings: () => void;
}) {
  const dateKey = localDateKey(now ?? new Date());
  const day = ensureDay(life, dateKey);
  const yesterdayKey = shiftDateKey(dateKey, -1);
  const yesterday = ensureDay(life, yesterdayKey);
  const due = dueHabits(life, dateKey);
  const yesterdayOpen = Boolean(life.days[yesterdayKey]) && !yesterday.closedAt;
  const doneHabitCount = due.filter((habit) => day.habitDone[habit.id]).length;
  const openTasks = board.tasks.filter((task) => !task.done);
  const doneToday = board.tasks.filter(
    (task) => task.done && task.doneAt && isoToLocalDateKey(task.doneAt) === dateKey,
  );
  const week = weekStrip(life, dateKey);
  const grouped: Record<Priority, Task[]> = {
    now: openTasks.filter((task) => task.priority === "now"),
    today: openTasks.filter((task) => task.priority === "today"),
    later: openTasks.filter((task) => task.priority === "later"),
  };
  const nextTasks = [...grouped.now, ...grouped.today].slice(0, 3);
  const nextIds = new Set(nextTasks.map((task) => task.id));
  const restTasks: Record<Priority, Task[]> = {
    now: grouped.now.filter((task) => !nextIds.has(task.id)),
    today: grouped.today.filter((task) => !nextIds.has(task.id)),
    later: grouped.later,
  };
  const groceriesOpen = board.groceries.filter((item) => !item.checked);
  const spent = spendTotal(day.spends);
  const streak = streakCount(life, dateKey);
  const phase = dayPhase(now ?? new Date());
  const currency = settings.currency || "$";

  const greeting = useMemo(() => {
    if (!now) return "Today";
    const hello =
      phase === "morning"
        ? "Good morning"
        : phase === "afternoon"
          ? "Good afternoon"
          : "Good evening";
    return settings.profile.name.trim()
      ? `${hello}, ${settings.profile.name.trim()}`
      : hello;
  }, [now, phase, settings.profile.name]);

  const dateLabel = useMemo(() => {
    if (!now) return "Your day";
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(now);
  }, [now]);

  const phaseLine =
    phase === "morning"
      ? "Check the repeating list, then the next three tasks. That is the morning."
      : phase === "afternoon"
        ? "If dinner is blank, pick it now so 7pm is not a negotiation."
        : "Close the leftover checks. Log dinner and money. Then stop.";

  const [kind, setKind] = useState<QuickKind>("task");
  const [quick, setQuick] = useState("");
  const [spendNote, setSpendNote] = useState("");
  const [busy, setBusy] = useState<"brief" | "dinner" | "wrap" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function patchDay(partial: Partial<typeof day>) {
    onLife(upsertDay(life, { ...day, ...partial }));
  }

  function addQuick() {
    const value = quick.trim();
    if (!value) return;
    const actual = guessKind(value, kind);
    if (actual === "spend" || kind === "spend") {
      const parsed = parseSpend(value);
      if (parsed) {
        patchDay({
          spends: [
            {
              id: createId("spend"),
              amount: parsed.amount,
              note: parsed.note,
              createdAt: new Date().toISOString(),
            },
            ...day.spends,
          ],
        });
        setQuick("");
        return;
      }
      setError("Spends look like: 6.50 coffee");
      return;
    }
    if (actual === "grocery") {
      onChange({
        ...board,
        groceries: [
          ...board.groceries,
          { id: createId("groc"), name: value, checked: false },
        ],
      });
      setQuick("");
      return;
    }
    onChange({
      ...board,
      tasks: [
        {
          id: createId("task"),
          title: value,
          priority: phase === "evening" ? "today" : "now",
          done: false,
          createdAt: new Date().toISOString(),
        },
        ...board.tasks,
      ],
    });
    setQuick("");
  }

  function addNamedSpend() {
    const parsed = parseSpend(quick) ?? parseSpend(`${quick} ${spendNote}`.trim());
    const amountOnly = parseAmountOnly(quick);
    if (parsed) {
      patchDay({
        spends: [
          {
            id: createId("spend"),
            amount: parsed.amount,
            note: parsed.note,
            createdAt: new Date().toISOString(),
          },
          ...day.spends,
        ],
      });
      setQuick("");
      setSpendNote("");
      return;
    }
    if (amountOnly && spendNote.trim()) {
      patchDay({
        spends: [
          {
            id: createId("spend"),
            amount: amountOnly,
            note: spendNote.trim(),
            createdAt: new Date().toISOString(),
          },
          ...day.spends,
        ],
      });
      setQuick("");
      setSpendNote("");
      return;
    }
    setError("Add an amount and what it was for.");
  }

  function dayBody() {
    return {
      model: settings.model,
      profile: settings.profile,
      nowIso: new Date().toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      energy: day.energy,
      habits: due.map((habit) => ({
        title: habit.title,
        done: Boolean(day.habitDone[habit.id]),
      })),
      tasks: board.tasks.map((task) => ({
        title: task.title,
        priority: task.priority,
        done: task.done,
      })),
      groceries: groceriesOpen.map((item) => item.name),
      spends: day.spends.map((spend) => ({
        amount: spend.amount,
        note: spend.note,
      })),
      drafts: board.drafts.map((draft) => draft.purpose),
      dinner: day.dinner?.name,
      currency,
    };
  }

  async function runBrief() {
    if (!canUseModel) {
      setError(UNAVAILABLE);
      return;
    }
    setBusy("brief");
    setError(null);
    try {
      const result = await postJson<DayBrief>(
        "/api/day",
        { action: "brief", ...dayBody() },
      );
      patchDay({
        brief: [result.headline, ...result.moves.map((move) => `• ${move}`)].join(
          "\n",
        ),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Brief failed.");
    } finally {
      setBusy(null);
    }
  }

  async function runDinner() {
    setBusy("dinner");
    setError(null);
    try {
      if (canUseModel) {
        const result = await postJson<DayDinner>(
          "/api/day",
          { action: "dinner", ...dayBody() },
        );
        patchDay({
          dinner: { ...result, source: "ai" },
        });
        return;
      }
      const fallback = dinnerFromGroceries(groceriesOpen.map((item) => item.name));
      patchDay({ dinner: { ...fallback, source: "list" } });
    } catch {
      const fallback = dinnerFromGroceries(groceriesOpen.map((item) => item.name));
      patchDay({ dinner: { ...fallback, source: "list" } });
    } finally {
      setBusy(null);
    }
  }

  async function closeDay() {
    setBusy("wrap");
    setError(null);
    const fallback = localWrap(
      doneHabitCount,
      due.length,
      doneToday.length,
      openTasks.length,
      formatMoney(spent, currency),
      day.dinner?.name,
    );
    try {
      if (canUseModel) {
        const result = await postJson<DayWrap>(
          "/api/day",
          { action: "wrap", ...dayBody() },
        );
        patchDay({
          wrap: `${result.wrap} Tomorrow: ${result.tomorrow}`,
          closedAt: new Date().toISOString(),
        });
        return;
      }
      patchDay({ wrap: fallback, closedAt: new Date().toISOString() });
    } catch {
      patchDay({ wrap: fallback, closedAt: new Date().toISOString() });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
        <h1 className="font-heading text-3xl leading-tight font-medium tracking-tight">
          {greeting}
        </h1>
        <p className="text-sm text-muted-foreground">{phaseLine}</p>
        <p className="text-xs text-muted-foreground">
          {doneHabitCount}/{due.length || 0} daily · {openTasks.length} open tasks
          {groceriesOpen.length ? ` · ${groceriesOpen.length} to buy` : ""} ·{" "}
          {formatMoney(spent, currency)} today
          {streak ? ` · ${streak} day streak` : ""}
        </p>
        <div className="mt-3 flex gap-1" aria-label="Last seven days">
          {week.map((dayDot) => (
            <div
              key={dayDot.key}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <span className="text-[10px] text-muted-foreground">{dayDot.label}</span>
              <span
                className={`h-1.5 w-full rounded-full ${
                  dayDot.done
                    ? "bg-primary"
                    : dayDot.isToday
                      ? "bg-primary/30"
                      : "bg-secondary"
                }`}
              />
            </div>
          ))}
        </div>
      </header>

      {yesterdayOpen ? (
        <Card>
          <CardContent className="flex flex-col gap-2 py-4">
            <p className="text-sm font-medium">Yesterday is still open.</p>
            <p className="text-sm text-muted-foreground">
              Close it, or skip so today is not mixed with leftover guilt.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  onLife(
                    upsertDay(life, {
                      ...yesterday,
                      closedAt: new Date().toISOString(),
                      wrap:
                        yesterday.wrap ||
                        "Closed late. Unchecked items stay on the repeating list.",
                    }),
                  )
                }
              >
                Close yesterday
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  onLife(
                    upsertDay(life, {
                      ...yesterday,
                      closedAt: new Date().toISOString(),
                      wrap: yesterday.wrap || "Skipped.",
                    }),
                  )
                }
              >
                Skip
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {(["task", "grocery", "spend"] as QuickKind[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setKind(item)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                kind === item
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {item === "task" ? "Task" : item === "grocery" ? "Buy" : "Spent"}
            </button>
          ))}
        </div>
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (kind === "spend") addNamedSpend();
            else addQuick();
            setError(null);
          }}
        >
          <div className="flex gap-2">
            <Input
              value={quick}
              onChange={(event) => setQuick(event.target.value)}
              placeholder={
                kind === "spend"
                  ? "6.50 coffee"
                  : kind === "grocery"
                    ? "Milk, eggs…"
                    : "What needs doing?"
              }
              className="h-11"
            />
            <Button type="submit" className="h-11">
              <PlusIcon />
              Add
            </Button>
          </div>
          {kind === "spend" ? (
            <Input
              value={spendNote}
              onChange={(event) => setSpendNote(event.target.value)}
              placeholder="If you only typed the amount, what was it for?"
              className="h-10"
            />
          ) : null}
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-xl">Today’s checks</h2>
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={onSettings}
          >
            Edit list
          </button>
        </div>
        {due.length ? (
          <Card size="sm">
            <CardContent className="flex flex-col">
              {due.map((habit) => {
                const checked = Boolean(day.habitDone[habit.id]);
                return (
                  <label
                    key={habit.id}
                    className="flex items-center gap-3 border-b border-border/60 py-3 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        patchDay({
                          habitDone: {
                            ...day.habitDone,
                            [habit.id]: !checked,
                          },
                        })
                      }
                      className="size-5 accent-primary"
                    />
                    <span className={checked ? "text-muted-foreground line-through" : ""}>
                      {habit.title}
                    </span>
                  </label>
                );
              })}
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            Add repeating daily items in Settings. That is what makes this worth
            opening tomorrow.
          </p>
        )}
      </section>

      {nextTasks.length ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-xl">Do next</h2>
          {nextTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => toggleTask(board, onChange, task.id)}
              onRemove={() =>
                onChange({
                  ...board,
                  tasks: board.tasks.filter((item) => item.id !== task.id),
                })
              }
            />
          ))}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          No open “now” or “today” tasks. Dump a messy list, or add one above.
        </p>
      )}

      {board.drafts.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Unsent ({board.drafts.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {board.drafts.slice(0, 2).map((draft) => (
              <div key={draft.id} className="flex flex-col gap-2">
                <p className="text-sm font-medium">{draft.purpose}</p>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {draft.text}
                </p>
                <CopyButton text={draft.text} />
              </div>
            ))}
            <Button type="button" variant="outline" onClick={onReply}>
              Write another reply
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl">Tonight</h2>
        {day.dinner ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHatIcon className="size-4 text-primary" />
                {day.dinner.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {day.dinner.why ? (
                <p className="text-muted-foreground">{day.dinner.why}</p>
              ) : null}
              {day.dinner.steps?.length ? (
                <ol className="list-decimal space-y-1 pl-4">
                  {day.dinner.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => patchDay({ dinner: undefined })}
              >
                Clear dinner
              </Button>
              {board.meals.length ? (
                <div className="flex flex-col gap-1 pt-1">
                  <p className="text-xs text-muted-foreground">Other ideas</p>
                  {board.meals
                    .filter((meal) => meal.name !== day.dinner?.name)
                    .slice(0, 3)
                    .map((meal) => (
                      <button
                        key={meal.id}
                        type="button"
                        className="text-left text-sm underline-offset-4 hover:underline"
                        onClick={() =>
                          patchDay({
                            dinner: {
                              name: meal.name,
                              why: meal.why,
                              steps: meal.steps,
                              source: "list",
                            },
                          })
                        }
                      >
                        {meal.name}
                      </button>
                    ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-3 py-4">
              <p className="text-sm text-muted-foreground">
                {groceriesOpen.length
                  ? `${groceriesOpen.length} things on the buy list. Turn that into dinner so you are not deciding hungry.`
                  : "No groceries yet. Dump a fridge photo, or pick a tired default."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void runDinner()}
                  disabled={busy === "dinner"}
                >
                  {busy === "dinner" ? "Picking…" : "What’s for dinner"}
                </Button>
                <Button type="button" variant="outline" onClick={onDump}>
                  Fridge photo
                </Button>
              </div>
              {board.meals.length ? (
                <div className="flex flex-col gap-2">
                  {board.meals.slice(0, 3).map((meal) => (
                    <Button
                      key={meal.id}
                      type="button"
                      variant="outline"
                      className="h-auto justify-start py-2 text-left"
                      onClick={() =>
                        patchDay({
                          dinner: {
                            name: meal.name,
                            why: meal.why,
                            steps: meal.steps,
                            source: "list",
                          },
                        })
                      }
                    >
                      Cook {meal.name}
                    </Button>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl">Money today</h2>
        <p className="text-sm text-muted-foreground">
          {formatMoney(spent, currency)} logged
        </p>
        {day.spends.length ? (
          <Card size="sm">
            <CardContent className="flex flex-col">
              {day.spends.map((spend) => (
                <SpendRow
                  key={spend.id}
                  spend={spend}
                  currency={currency}
                  onRemove={() =>
                    patchDay({
                      spends: day.spends.filter((item) => item.id !== spend.id),
                    })
                  }
                />
              ))}
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            Log coffee, Grab, lunch. Dump a receipt and it lands here too.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {(["low", "ok", "high"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => patchDay({ energy: level })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                day.energy === level
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {level === "low" ? "Low energy" : level === "ok" ? "OK" : "High energy"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void runBrief()}
            disabled={busy === "brief"}
          >
            {busy === "brief" ? "Planning…" : "Plan the next 90 minutes"}
          </Button>
          <Button
            type="button"
            onClick={() => void closeDay()}
            disabled={busy === "wrap" || Boolean(day.closedAt)}
          >
            {day.closedAt
              ? "Day closed"
              : busy === "wrap"
                ? "Closing…"
                : "Close the day"}
          </Button>
        </div>
        {day.brief ? (
          <Card size="sm">
            <CardContent className="whitespace-pre-wrap text-sm leading-6">
              {day.brief}
            </CardContent>
          </Card>
        ) : null}
        {day.wrap ? (
          <Card size="sm">
            <CardContent className="text-sm leading-6 text-muted-foreground">
              {day.wrap}
            </CardContent>
          </Card>
        ) : null}
      </section>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {restTasks.now.length ||
      restTasks.today.length ||
      restTasks.later.length ||
      board.tasks.some((task) => task.done) ? (
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl">Tasks</h2>
        {(["now", "today", "later"] as Priority[]).map((priority) =>
          restTasks[priority].length ? (
            <div key={priority} className="flex flex-col gap-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {PRIORITY_LABEL[priority]}
              </p>
              {restTasks[priority].map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(board, onChange, task.id)}
                  onRemove={() =>
                    onChange({
                      ...board,
                      tasks: board.tasks.filter((item) => item.id !== task.id),
                    })
                  }
                />
              ))}
            </div>
          ) : null,
        )}
        {board.tasks.filter((task) => task.done).length ? (
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer select-none">
              {board.tasks.filter((task) => task.done).length} done
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              {board.tasks
                .filter((task) => task.done)
                .map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTask(board, onChange, task.id)}
                    onRemove={() =>
                      onChange({
                        ...board,
                        tasks: board.tasks.filter((item) => item.id !== task.id),
                      })
                    }
                  />
                ))}
            </div>
          </details>
        ) : null}
      </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl">To buy</h2>
        {board.groceries.length ? (
          <Card size="sm">
            <CardContent className="flex flex-col gap-1">
              {board.groceries.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg px-1 py-2"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() =>
                      onChange({
                        ...board,
                        groceries: board.groceries.map((grocery) =>
                          grocery.id === item.id
                            ? { ...grocery, checked: !grocery.checked }
                            : grocery,
                        ),
                      })
                    }
                    className="size-4 accent-primary"
                  />
                  <span
                    className={
                      item.checked
                        ? "flex-1 text-muted-foreground line-through"
                        : "flex-1"
                    }
                  >
                    {item.name}
                    {item.qty ? (
                      <span className="ml-2 text-muted-foreground">{item.qty}</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      onChange({
                        ...board,
                        groceries: board.groceries.filter(
                          (grocery) => grocery.id !== item.id,
                        ),
                      })
                    }
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </label>
              ))}
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            Use Buy above, or dump a fridge photo.
          </p>
        )}
      </section>

      {board.events.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl">When</h2>
          {board.events.map((event) => (
            <Card key={event.id} size="sm">
              <CardContent className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <CalendarIcon className="mt-0.5 size-4 text-primary" />
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.when}</p>
                    {event.where ? (
                      <p className="text-sm text-muted-foreground">{event.where}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => downloadIcs(event)}
                  >
                    .ics
                  </Button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      onChange({
                        ...board,
                        events: board.events.filter((item) => item.id !== event.id),
                      })
                    }
                    aria-label="Remove event"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {board.notes.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl">Notes</h2>
          {board.notes.map((note) => (
            <Card key={note.id} size="sm">
              <CardContent className="flex items-start gap-3">
                <StickyNoteIcon className="mt-0.5 size-4 text-primary" />
                <p className="flex-1 text-sm leading-6">{note.text}</p>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    onChange({
                      ...board,
                      notes: board.notes.filter((item) => item.id !== note.id),
                    })
                  }
                  aria-label="Remove note"
                >
                  <Trash2Icon className="size-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function toggleTask(
  board: Board,
  onChange: (board: Board) => void,
  id: string,
) {
  onChange({
    ...board,
    tasks: board.tasks.map((item) =>
      item.id === id
        ? {
            ...item,
            done: !item.done,
            doneAt: !item.done ? new Date().toISOString() : undefined,
          }
        : item,
    ),
  });
}

function SpendRow({
  spend,
  currency,
  onRemove,
}: {
  spend: Spend;
  currency: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-16 font-medium">{formatMoney(spend.amount, currency)}</span>
      <span className="flex-1 text-sm">{spend.note}</span>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground"
        onClick={onRemove}
        aria-label="Remove spend"
      >
        <Trash2Icon className="size-4" />
      </button>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onRemove,
}: {
  task: Task;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10">
      <button
        type="button"
        onClick={onToggle}
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
          task.done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-foreground/25"
        }`}
        aria-label={task.done ? "Mark not done" : "Mark done"}
      >
        {task.done ? <CheckIcon className="size-3" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p className={task.done ? "text-muted-foreground line-through" : ""}>
          {task.title}
        </p>
        {task.notes ? (
          <p className="text-sm text-muted-foreground">{task.notes}</p>
        ) : null}
        {task.due ? (
          <Badge variant="secondary" className="mt-1">
            {task.due}
          </Badge>
        ) : null}
      </div>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground"
        onClick={onRemove}
        aria-label="Remove task"
      >
        <Trash2Icon className="size-4" />
      </button>
    </div>
  );
}
