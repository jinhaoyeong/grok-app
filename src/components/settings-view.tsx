"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MODELS, MODEL_COPY, type ModelId } from "@/lib/models";
import { defaultSettings, emptyBoard, exportBoardJson } from "@/lib/storage";
import type { Board, Settings } from "@/lib/types";

export function SettingsView({
  settings,
  onChange,
  hasServerKey,
  board,
  onClearBoard,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
  hasServerKey: boolean;
  board: Board;
  onClearBoard: () => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const [cleared, setCleared] = useState(false);

  function downloadBoard() {
    const blob = new Blob([exportBoardJson(board)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sorted-board.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Account</p>
        <h1 className="font-heading text-3xl leading-tight font-medium tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Your key stays on this device unless you also set it on the server.
        </p>
      </header>

      {hasServerKey ? (
        <Alert>
          <AlertTitle>Server key is set</AlertTitle>
          <AlertDescription>
            OPENAI_API_KEY is available on the server. A key pasted here still
            overrides it for this browser.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col gap-3">
        <Label htmlFor="apiKey">OpenAI API key</Label>
        <Input
          id="apiKey"
          type={showKey ? "text" : "password"}
          autoComplete="off"
          value={settings.apiKey}
          onChange={(event) =>
            onChange({ ...settings, apiKey: event.target.value })
          }
          placeholder="sk-..."
          className="h-10 font-mono"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={showKey} onCheckedChange={setShowKey} />
          Show key
        </label>
        <p className="text-xs leading-5 text-muted-foreground">
          Create a key at platform.openai.com. Sorted never stores it in a
          database — only in this browser, and only sent to your own app server
          to call OpenAI.
        </p>
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
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={downloadBoard}>
            Export board
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onClearBoard();
              onChange(defaultSettings());
              setCleared(true);
            }}
          >
            Clear board and key
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
