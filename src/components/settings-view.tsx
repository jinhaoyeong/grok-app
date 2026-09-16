"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { defaultHabits } from "@/lib/day";
import { createId } from "@/lib/ids";
import { MODELS, MODEL_COPY, type ModelId } from "@/lib/models";
import { defaultSettings, emptyBoard, exportAllJson } from "@/lib/storage";
import type { Board, Cadence, Habit, Life, Settings } from "@/lib/types";

const CURRENCIES = ["$", "S$", "RM", "€", "£"];
const CADENCE_LABEL: Record<Cadence, string> = {
  daily: "Every day",
  weekdays: "Weekdays",
  weekends: "Weekends",
};

export function SettingsView({
  settings,
  onChange,
  gate,
  board,
  life,
  onLife,
  onClearAll,
  onLock,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
  gate: boolean;
  board: Board;
  life: Life;
  onLife: (life: Life) => void;
  onClearAll: () => void;
  onLock?: () => Promise<void>;
}) {
  const [cleared, setCleared] = useState(false);
  const [locking, setLocking] = useState(false);
  const [newHabit, setNewHabit] = useState("");
  const [newCadence, setNewCadence] = useState<Cadence>("daily");

  function downloadBackup() {
    const blob = new Blob([exportAllJson(board, life, settings)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sorted-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function addHabit() {
    const title = newHabit.trim();
    if (!title) return;
    onLife({
      ...life,
      habits: [
        ...life.habits,
        { id: createId("habit"), title, cadence: newCadence },
      ],
    });
    setNewHabit("");
  }

  function patchHabit(id: string, patch: Partial<Habit>) {
    onLife({
      ...life,
      habits: life.habits.map((habit) =>
        habit.id === id ? { ...habit, ...patch } : habit,
      ),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Account</p>
        <h1 className="font-heading text-3xl leading-tight font-medium tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          The repeating list is what makes Sorted worth opening tomorrow.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          value={settings.profile.name}
          onChange={(event) =>
            onChange({
              ...settings,
              profile: { ...settings.profile, name: event.target.value },
            })
          }
          placeholder="Jin"
          className="h-10"
        />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-heading text-xl">Daily checks</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These reset every local midnight. Keep them boring so you actually
            tick them.
          </p>
        </div>
        {life.habits.length ? (
          <Card size="sm">
            <CardContent className="flex flex-col gap-3">
              {life.habits.map((habit) => (
                <div key={habit.id} className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={habit.title}
                    onChange={(event) =>
                      patchHabit(habit.id, { title: event.target.value })
                    }
                    className="h-10 flex-1"
                    aria-label="Check title"
                  />
                  <div className="flex gap-2">
                    <Select
                      value={habit.cadence}
                      onValueChange={(value) =>
                        patchHabit(habit.id, { cadence: value as Cadence })
                      }
                    >
                      <SelectTrigger className="h-10 w-[9.5rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {(Object.keys(CADENCE_LABEL) as Cadence[]).map((cadence) => (
                          <SelectItem key={cadence} value={cadence}>
                            {CADENCE_LABEL[cadence]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        onLife({
                          ...life,
                          habits: life.habits.filter((item) => item.id !== habit.id),
                        })
                      }
                      aria-label={`Remove ${habit.title}`}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            No repeating checks. Add one, or restore the starter list.
          </p>
        )}
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            addHabit();
          }}
        >
          <Input
            value={newHabit}
            onChange={(event) => setNewHabit(event.target.value)}
            placeholder="New check, e.g. Take meds"
            className="h-10 flex-1"
          />
          <Select
            value={newCadence}
            onValueChange={(value) => setNewCadence(value as Cadence)}
          >
            <SelectTrigger className="h-10 w-full sm:w-[9.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {(Object.keys(CADENCE_LABEL) as Cadence[]).map((cadence) => (
                <SelectItem key={cadence} value={cadence}>
                  {CADENCE_LABEL[cadence]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" className="h-10">
            <PlusIcon />
            Add
          </Button>
        </form>
        <Button
          type="button"
          variant="outline"
          onClick={() => onLife({ ...life, habits: defaultHabits() })}
        >
          Restore starter list
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <Label>Currency</Label>
        <div className="flex flex-wrap gap-2">
          {CURRENCIES.map((symbol) => (
            <button
              key={symbol}
              type="button"
              onClick={() => onChange({ ...settings, currency: symbol })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                settings.currency === symbol
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {symbol}
            </button>
          ))}
        </div>
        <Input
          value={settings.currency}
          onChange={(event) =>
            onChange({ ...settings, currency: event.target.value.slice(0, 4) })
          }
          className="h-10 w-24"
          aria-label="Custom currency"
        />
      </section>

      <section className="flex flex-col gap-3">
        <Label>Model</Label>
        <Select
          value={settings.model}
          onValueChange={(value) =>
            onChange({ ...settings, model: value as ModelId })
          }
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {MODELS.map((model) => (
              <SelectItem key={model} value={model}>
                {MODEL_COPY[model].label} · {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {MODEL_COPY[settings.model].hint}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <Label htmlFor="context">Life context</Label>
        <Textarea
          id="context"
          value={settings.profile.context}
          onChange={(event) =>
            onChange({
              ...settings,
              profile: { ...settings.profile, context: event.target.value },
            })
          }
          placeholder="Who you cook for, diet, typical schedule, city, what “busy” looks like."
          className="min-h-28 bg-card"
        />
      </section>

      <section className="flex flex-col gap-3">
        <Label htmlFor="voice">How you write</Label>
        <Textarea
          id="voice"
          value={settings.profile.voice}
          onChange={(event) =>
            onChange({
              ...settings,
              profile: { ...settings.profile, voice: event.target.value },
            })
          }
          className="min-h-24 bg-card"
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl">This device</h2>
        <p className="text-sm text-muted-foreground">
          On a phone: browser menu → Add to Home Screen. Sorted is a standalone
          page, so the morning check is one tap.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={downloadBackup}>
            Export backup
          </Button>
          {gate && onLock ? (
            <Button
              type="button"
              variant="outline"
              disabled={locking}
              onClick={() => {
                setLocking(true);
                void onLock().finally(() => setLocking(false));
              }}
            >
              {locking ? "Locking…" : "Lock this device"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onClearAll();
              onChange(defaultSettings());
              setCleared(true);
            }}
          >
            Clear board and checks
          </Button>
        </div>
        {cleared ? (
          <p className="text-xs text-muted-foreground">
            Cleared. {emptyBoard().tasks.length === 0 ? "This device is empty." : ""}
          </p>
        ) : null}
      </section>
    </div>
  );
}
