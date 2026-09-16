"use client";

import { useState } from "react";
import { SparklesIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { postJson, UNAVAILABLE } from "@/lib/client-api";
import { createId } from "@/lib/ids";
import { REPLY_SAMPLE } from "@/lib/examples";
import type { Board, ReplyResult, Settings } from "@/lib/types";

const TONE_LABEL = {
  short: "Short",
  warm: "Warm",
  direct: "Direct",
} as const;

export function ReplyView({
  board,
  settings,
  canUseModel,
  onSaveDraft,
}: {
  board: Board;
  settings: Settings;
  canUseModel: boolean;
  onSaveDraft: (board: Board) => void;
}) {
  const [incoming, setIncoming] = useState("");
  const [want, setWant] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReplyResult | null>(null);

  async function generate() {
    if (!canUseModel) {
      setError(UNAVAILABLE);
      return;
    }
    if (!incoming.trim()) {
      setError("Paste the message you need to answer.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await postJson<ReplyResult>(
        "/api/reply",
        {
          incoming,
          want,
          model: settings.model,
          profile: settings.profile,
        },
      );
      setResult(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reply failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Messages</p>
        <h1 className="font-heading text-3xl leading-tight font-medium tracking-tight">
          Write the reply
        </h1>
        <p className="text-sm text-muted-foreground">
          Paste the awkward text. Get three sendable versions.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <Label htmlFor="incoming">Incoming message</Label>
        <Textarea
          id="incoming"
          value={incoming}
          onChange={(event) => setIncoming(event.target.value)}
          placeholder="Paste the WhatsApp, email, or group chat…"
          className="min-h-36 bg-card"
        />
        <button
          type="button"
          className="self-start text-xs text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setIncoming(REPLY_SAMPLE)}
        >
          Use a sample
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="want">What you want (optional)</Label>
        <Input
          id="want"
          value={want}
          onChange={(event) => setWant(event.target.value)}
          placeholder="Say no without sounding cold / confirm Sunday but after 3"
          className="h-10"
        />
      </div>

      <Button
        type="button"
        className="h-11"
        onClick={() => void generate()}
        disabled={busy}
      >
        <SparklesIcon />
        {busy ? "Writing…" : "Draft replies"}
      </Button>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn’t write that</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{result.readsAs}</p>
          {result.replies.map((reply) => (
            <Card key={`${reply.tone}-${reply.text.slice(0, 12)}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <Badge variant="secondary">{TONE_LABEL[reply.tone]}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="whitespace-pre-wrap text-sm leading-6">{reply.text}</p>
                <div className="flex flex-wrap gap-2">
                  <CopyButton text={reply.text} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onSaveDraft({
                        ...board,
                        drafts: [
                          {
                            id: createId("draft"),
                            purpose: `Reply (${TONE_LABEL[reply.tone]})`,
                            text: reply.text,
                          },
                          ...board.drafts,
                        ],
                      })
                    }
                  >
                    Save to Today
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
