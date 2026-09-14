"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { KeyRoundIcon } from "lucide-react";

export function KeyBanner({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <Alert className="border-primary/20 bg-primary/5">
      <KeyRoundIcon />
      <AlertTitle>Add your OpenAI key to use credit</AlertTitle>
      <AlertDescription>
        Sorted runs on your OpenAI account. Paste a key in Settings, or set{" "}
        <code className="font-mono text-xs">OPENAI_API_KEY</code> on the server.
      </AlertDescription>
      <div className="col-start-2 mt-2">
        <Button type="button" size="sm" onClick={onOpenSettings}>
          Open Settings
        </Button>
      </div>
    </Alert>
  );
}
