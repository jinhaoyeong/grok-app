"use client";

import { useRef, useState } from "react";
import { CameraIcon, ImagePlusIcon, SparklesIcon, XIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyBanner } from "@/components/key-banner";
import { Textarea } from "@/components/ui/textarea";
import { postJson } from "@/lib/client-api";
import { DUMP_CHIPS } from "@/lib/examples";
import { compressImage } from "@/lib/image";
import { mergeBoard, toBoardPatch } from "@/lib/merge";
import type { Board, DinnerLog, ExtractedBoard, Settings } from "@/lib/types";

type Selection = {
  tasks: boolean[];
  groceries: boolean[];
  events: boolean[];
  drafts: boolean[];
  meals: boolean[];
  notes: boolean[];
  spends: boolean[];
};

function allTrue(length: number): boolean[] {
  return Array.from({ length }, () => true);
}

function selectedFrom(extracted: ExtractedBoard): Selection {
  return {
    tasks: allTrue(extracted.tasks.length),
    groceries: allTrue(extracted.groceries.length),
    events: allTrue(extracted.events.length),
    drafts: allTrue(extracted.drafts.length),
    meals: allTrue(extracted.meals.length),
    notes: allTrue(extracted.notes.length),
    spends: allTrue(extracted.spends.length),
  };
}

function withSpends(extracted: ExtractedBoard): ExtractedBoard {
  return { ...extracted, spends: extracted.spends ?? [] };
}

export function DumpView({
  board,
  settings,
  hasKey,
  onOpenSettings,
  onAccept,
}: {
  board: Board;
  settings: Settings;
  hasKey: boolean;
  onOpenSettings: () => void;
  onAccept: (
    next: Board,
    extras: {
      spends: Array<{ amount: number; note: string }>;
      dinner?: DinnerLog;
    },
  ) => void;
}) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedBoard | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await compressImage(file);
      setImage(dataUrl);
    } catch {
      setError("That photo could not be read.");
    }
  }

  async function sortDump() {
    if (!hasKey) {
      setError("Add your OpenAI API key in Settings first.");
      return;
    }
    if (!text.trim() && !image) {
      setError("Type something or add a photo first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = withSpends(
        await postJson<ExtractedBoard>(
          "/api/sort",
          {
            text,
            image: image ?? undefined,
            model: settings.model,
            profile: settings.profile,
            existing: {
              tasks: board.tasks.filter((task) => !task.done).map((task) => task.title),
              groceries: board.groceries
                .filter((item) => !item.checked)
                .map((item) => item.name),
            },
            nowIso: new Date().toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          settings.apiKey.trim() || undefined,
        ),
      );
      setExtracted(result);
      setSelection(selectedFrom(result));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sort failed.");
    } finally {
      setBusy(false);
    }
  }

  function keepSelected() {
    if (!extracted || !selection) return;
    const filtered: ExtractedBoard = {
      summary: extracted.summary,
      tasks: extracted.tasks.filter((_, index) => selection.tasks[index]),
      groceries: extracted.groceries.filter((_, index) => selection.groceries[index]),
      events: extracted.events.filter((_, index) => selection.events[index]),
      drafts: extracted.drafts.filter((_, index) => selection.drafts[index]),
      meals: extracted.meals.filter((_, index) => selection.meals[index]),
      notes: extracted.notes.filter((_, index) => selection.notes[index]),
      spends: extracted.spends.filter((_, index) => selection.spends[index]),
    };
    const firstMeal = filtered.meals[0];
    onAccept(mergeBoard(board, toBoardPatch(filtered)), {
      spends: filtered.spends,
      dinner: firstMeal
        ? {
            name: firstMeal.name,
            why: firstMeal.why,
            steps: firstMeal.steps,
            source: "list",
          }
        : undefined,
    });
    setExtracted(null);
    setSelection(null);
    setText("");
    setImage(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Capture</p>
        <h1 className="font-heading text-3xl leading-tight font-medium tracking-tight">
          Dump the mess
        </h1>
        <p className="text-sm text-muted-foreground">
          Brain dump, WhatsApp, fridge, receipt. Tasks and groceries stay on the
          board. Money and dinner land on Today.
        </p>
      </header>

      {!hasKey ? <KeyBanner onOpenSettings={onOpenSettings} /> : null}

      <div className="flex flex-wrap gap-2">
        {DUMP_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
            onClick={() => setText(chip.text)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Paste a chat, a fridge list, a receipt, or whatever is in your head…"
        className="min-h-40 bg-card text-base leading-6"
      />

      {image ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Attached dump"
            className="h-32 w-32 rounded-xl object-cover ring-1 ring-foreground/10"
          />
          <button
            type="button"
            className="absolute -top-2 -right-2 rounded-full bg-foreground p-1 text-background"
            onClick={() => setImage(null)}
            aria-label="Remove photo"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => cameraRef.current?.click()}
        >
          <CameraIcon />
          Camera
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlusIcon />
          Photo
        </Button>
        <Button
          type="button"
          className="h-11 flex-1"
          onClick={sortDump}
          disabled={busy}
        >
          <SparklesIcon />
          {busy ? "Sorting…" : "Sort with OpenAI"}
        </Button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            void onPickFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void onPickFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn’t sort that</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {extracted && selection ? (
        <Card>
          <CardHeader>
            <CardTitle>Keep what you want</CardTitle>
            <p className="text-sm text-muted-foreground">{extracted.summary}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <PreviewGroup
              title="Tasks"
              items={extracted.tasks.map((task) => task.title)}
              selected={selection.tasks}
              onToggle={(index) =>
                setSelection({
                  ...selection,
                  tasks: selection.tasks.map((value, itemIndex) =>
                    itemIndex === index ? !value : value,
                  ),
                })
              }
            />
            <PreviewGroup
              title="Groceries"
              items={extracted.groceries.map((item) =>
                item.qty ? `${item.name} (${item.qty})` : item.name,
              )}
              selected={selection.groceries}
              onToggle={(index) =>
                setSelection({
                  ...selection,
                  groceries: selection.groceries.map((value, itemIndex) =>
                    itemIndex === index ? !value : value,
                  ),
                })
              }
            />
            <PreviewGroup
              title="Spent"
              items={extracted.spends.map(
                (item) =>
                  `${settings.currency || "$"}${item.amount} ${item.note}`,
              )}
              selected={selection.spends}
              onToggle={(index) =>
                setSelection({
                  ...selection,
                  spends: selection.spends.map((value, itemIndex) =>
                    itemIndex === index ? !value : value,
                  ),
                })
              }
            />
            <PreviewGroup
              title="When"
              items={extracted.events.map((item) => `${item.title} · ${item.when}`)}
              selected={selection.events}
              onToggle={(index) =>
                setSelection({
                  ...selection,
                  events: selection.events.map((value, itemIndex) =>
                    itemIndex === index ? !value : value,
                  ),
                })
              }
            />
            <PreviewGroup
              title="Drafts"
              items={extracted.drafts.map((item) => item.purpose)}
              selected={selection.drafts}
              onToggle={(index) =>
                setSelection({
                  ...selection,
                  drafts: selection.drafts.map((value, itemIndex) =>
                    itemIndex === index ? !value : value,
                  ),
                })
              }
            />
            <PreviewGroup
              title="Meals"
              items={extracted.meals.map((item) => item.name)}
              selected={selection.meals}
              onToggle={(index) =>
                setSelection({
                  ...selection,
                  meals: selection.meals.map((value, itemIndex) =>
                    itemIndex === index ? !value : value,
                  ),
                })
              }
            />
            <PreviewGroup
              title="Notes"
              items={extracted.notes.map((item) => item.text)}
              selected={selection.notes}
              onToggle={(index) =>
                setSelection({
                  ...selection,
                  notes: selection.notes.map((value, itemIndex) =>
                    itemIndex === index ? !value : value,
                  ),
                })
              }
            />
            <Button type="button" className="h-11" onClick={keepSelected}>
              Keep selected on Today
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function PreviewGroup({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: string[];
  selected: boolean[];
  onToggle: (index: number) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </p>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      {items.map((item, index) => (
        <label key={`${title}-${index}`} className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={selected[index]}
            onChange={() => onToggle(index)}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>{item}</span>
        </label>
      ))}
    </div>
  );
}
