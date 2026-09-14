"use client";

import { useState } from "react";
import { SparklesIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KeyBanner } from "@/components/key-banner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { postJson } from "@/lib/client-api";
import { createId } from "@/lib/ids";
import type { Board, DecideResult, Settings } from "@/lib/types";

export function DecideView({
  board,
  settings,
  hasKey,
  onOpenSettings,
  onSaveTask,
}: {
  board: Board;
  settings: Settings;
  hasKey: boolean;
  onOpenSettings: () => void;
  onSaveTask: (board: Board) => void;
}) {
  const [decision, setDecision] = useState("");
  const [optionsText, setOptionsText] = useState("Stay in and cook\nGo out to eat");
  const [constraints, setConstraints] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DecideResult | null>(null);

  async function decide() {
    const options = optionsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!hasKey) {
      setError("Add your OpenAI API key in Settings first.");
      return;
    }
    if (!decision.trim() || options.length < 2) {
      setError("Write the decision and at least two options, one per line.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await postJson<DecideResult>(
        "/api/decide",
        {
          decision,
          options,
          constraints,
          model: settings.model,
          profile: settings.profile,
        },
        settings.apiKey.trim() || undefined,
      );
      setResult(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Decide failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Choose</p>
        <h1 className="font-heading text-3xl leading-tight font-medium tracking-tight">
          Pick one
        </h1>
        <p className="text-sm text-muted-foreground">
          Dinner, plans, which task first. One answer, then a first step.
        </p>
      </header>

      {!hasKey ? <KeyBanner onOpenSettings={onOpenSettings} /> : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="decision">The decision</Label>
        <Input
          id="decision"
          value={decision}
          onChange={(event) => setDecision(event.target.value)}
          placeholder="What should I eat tonight?"
          className="h-10"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="options">Options (one per line)</Label>
        <Textarea
          id="options"
          value={optionsText}
          onChange={(event) => setOptionsText(event.target.value)}
          className="min-h-28 bg-card"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="constraints">Constraints (optional)</Label>
        <Textarea
          id="constraints"
          value={constraints}
          onChange={(event) => setConstraints(event.target.value)}
          placeholder="Tired, don’t want to spend, leftover rice in the fridge"
          className="min-h-24 bg-card"
        />
      </div>

      <Button
        type="button"
        className="h-11"
        onClick={() => void decide()}
        disabled={busy}
      >
        <SparklesIcon />
        {busy ? "Thinking…" : "Decide"}
      </Button>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn’t decide</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">{result.pick}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm leading-6">
            <p>{result.why}</p>
            <p className="text-muted-foreground">If that is wrong: {result.ifWrong}</p>
            <p>
              <span className="font-medium">First step: </span>
              {result.firstStep}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onSaveTask({
                  ...board,
                  tasks: [
                    {
                      id: createId("task"),
                      title: result.firstStep,
                      notes: result.pick,
                      priority: "now",
                      done: false,
                      createdAt: new Date().toISOString(),
                    },
                    ...board.tasks,
                  ],
                })
              }
            >
              Put the first step on Today
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
