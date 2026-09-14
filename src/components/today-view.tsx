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
import { createId } from "@/lib/ids";
import { downloadIcs } from "@/lib/ics";
import { countOpen } from "@/lib/merge";
import type { Board, Priority, Task } from "@/lib/types";

const PRIORITY_LABEL: Record<Priority, string> = {
  now: "Now",
  today: "Today",
  later: "Later",
};

export function TodayView({
  board,
  onChange,
  name,
  now,
  onDump,
}: {
  board: Board;
  onChange: (board: Board) => void;
  name: string;
  now: Date | null;
  onDump: () => void;
}) {
  const greeting = useMemo(() => {
    if (!now) return "Today";
    const hour = now.getHours();
    const hello =
      hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    return name.trim() ? `${hello}, ${name.trim()}` : hello;
  }, [name, now]);

  const dateLabel = useMemo(() => {
    if (!now) return "Your board";
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(now);
  }, [now]);

  const open = countOpen(board);
  const openTasks = board.tasks.filter((task) => !task.done);
  const doneTasks = board.tasks.filter((task) => task.done);
  const grouped: Record<Priority, Task[]> = {
    now: openTasks.filter((task) => task.priority === "now"),
    today: openTasks.filter((task) => task.priority === "today"),
    later: openTasks.filter((task) => task.priority === "later"),
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
        <h1 className="font-heading text-3xl leading-tight font-medium tracking-tight">
          {greeting}
        </h1>
        <p className="text-sm text-muted-foreground">
          {open.tasks} open {open.tasks === 1 ? "task" : "tasks"} · {open.groceries}{" "}
          grocery {open.groceries === 1 ? "item" : "items"}
        </p>
      </header>

      {board.tasks.length === 0 &&
      board.groceries.length === 0 &&
      board.events.length === 0 &&
      board.drafts.length === 0 &&
      board.meals.length === 0 &&
      board.notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 py-6">
            <p className="font-heading text-lg">The board is empty.</p>
            <p className="text-sm text-muted-foreground">
              Dump a messy thought, a fridge photo, a receipt, or a chat. Sorted
              files it into tasks, groceries, drafts, and meals.
            </p>
            <Button type="button" className="h-11 w-full sm:w-auto" onClick={onDump}>
              Dump something
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <SectionTitle>Tasks</SectionTitle>
        <AddRow
          placeholder="Add a task"
          onAdd={(title) =>
            onChange({
              ...board,
              tasks: [
                {
                  id: createId("task"),
                  title,
                  priority: "today",
                  done: false,
                  createdAt: new Date().toISOString(),
                },
                ...board.tasks,
              ],
            })
          }
        />
        {(["now", "today", "later"] as Priority[]).map((priority) =>
          grouped[priority].length ? (
            <div key={priority} className="flex flex-col gap-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {PRIORITY_LABEL[priority]}
              </p>
              {grouped[priority].map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() =>
                    onChange({
                      ...board,
                      tasks: board.tasks.map((item) =>
                        item.id === task.id ? { ...item, done: !item.done } : item,
                      ),
                    })
                  }
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
        {doneTasks.length ? (
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer select-none">
              {doneTasks.length} done
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              {doneTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() =>
                    onChange({
                      ...board,
                      tasks: board.tasks.map((item) =>
                        item.id === task.id ? { ...item, done: !item.done } : item,
                      ),
                    })
                  }
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

      <section className="flex flex-col gap-3">
        <SectionTitle>Groceries</SectionTitle>
        <AddRow
          placeholder="Add milk, eggs…"
          onAdd={(name) =>
            onChange({
              ...board,
              groceries: [
                ...board.groceries,
                { id: createId("groc"), name, checked: false },
              ],
            })
          }
        />
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
            Dump a fridge photo or a shopping thought and they land here.
          </p>
        )}
      </section>

      {board.drafts.length ? (
        <section className="flex flex-col gap-3">
          <SectionTitle>Drafts to send</SectionTitle>
          {board.drafts.map((draft) => (
            <Card key={draft.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{draft.purpose}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      onChange({
                        ...board,
                        drafts: board.drafts.filter((item) => item.id !== draft.id),
                      })
                    }
                    aria-label="Remove draft"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </CardTitle>
                {draft.to ? (
                  <p className="text-xs text-muted-foreground">To {draft.to}</p>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="whitespace-pre-wrap text-sm leading-6">{draft.text}</p>
                <CopyButton text={draft.text} label="Copy reply" />
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {board.events.length ? (
        <section className="flex flex-col gap-3">
          <SectionTitle>When</SectionTitle>
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

      {board.meals.length ? (
        <section className="flex flex-col gap-3">
          <SectionTitle>Meals</SectionTitle>
          {board.meals.map((meal) => (
            <Card key={meal.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <ChefHatIcon className="size-4 text-primary" />
                    {meal.name}
                  </span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      onChange({
                        ...board,
                        meals: board.meals.filter((item) => item.id !== meal.id),
                      })
                    }
                    aria-label="Remove meal"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">{meal.why}</p>
                <ol className="list-decimal space-y-1 pl-4 text-sm">
                  {meal.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {board.notes.length ? (
        <section className="flex flex-col gap-3">
          <SectionTitle>Notes</SectionTitle>
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

function SectionTitle({ children }: { children: string }) {
  return <h2 className="font-heading text-xl">{children}</h2>;
}

function AddRow({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const next = value.trim();
        if (!next) return;
        onAdd(next);
        setValue("");
      }}
    >
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="h-10"
      />
      <Button type="submit" variant="secondary" className="h-10">
        <PlusIcon />
        Add
      </Button>
    </form>
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
