import {
  accessGateEnabled,
  hasValidSession,
  hostedOnVercel,
  requireBrowserGet,
  signingSecret,
} from "@/lib/api-guard";
import { hasServerKey, jsonOk } from "@/lib/openai-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = await requireBrowserGet(request, {
    rateKey: "status",
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });
  if (blocked) return blocked;

  if (hostedOnVercel() && !signingSecret()) {
    return jsonOk({ locked: true, ai: false, gate: true });
  }

  const gate = accessGateEnabled();
  const unlocked = hasValidSession(request);
  if (gate && !unlocked) {
    return jsonOk({ locked: true, ai: false, gate: true });
  }
  return jsonOk({
    locked: false,
    ai: hasServerKey(),
    gate,
  });
}
