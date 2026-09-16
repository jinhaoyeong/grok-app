"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unlockApp } from "@/lib/client-api";

export function UnlockView({ onUnlock }: { onUnlock: () => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await unlockApp(password);
      setPassword("");
      await onUnlock();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not unlock.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4">
      <p className="font-heading text-2xl italic">Sorted</p>
      <h1 className="font-heading mt-4 text-3xl leading-tight font-medium tracking-tight">
        Unlock this device
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the passcode you set. Only you, or people you approve, can open
        this.
      </p>
      <form className="mt-6 flex flex-col gap-3" onSubmit={submit}>
        <Label htmlFor="passcode">Passcode</Label>
        <Input
          id="passcode"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-10"
        />
        <Button type="submit" className="h-10" disabled={busy || !password}>
          {busy ? "Checking…" : "Unlock"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </form>
    </div>
  );
}
