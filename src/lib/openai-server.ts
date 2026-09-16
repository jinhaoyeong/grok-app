import "server-only";

import { createOpenAI } from "@ai-sdk/openai";
import { DEFAULT_MODEL, isModelId, type ModelId } from "@/lib/models";
import { envString, hostedOnVercel } from "@/lib/runtime-env";

export { hostedOnVercel };

const NO_STORE = {
  "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Vary: "Cookie, Origin",
} as const;

const SECRET_PATTERNS = [
  /sk-(?:proj|svcacct|admin)?-[a-zA-Z0-9_-]{8,}/gi,
  /sk-[a-zA-Z0-9_-]{8,}/gi,
  /Bearer\s+[A-Za-z0-9._\-+=/]+/gi,
  /(?:OPENAI_API_KEY|APP_ACCESS_SECRET|api[_-]?key)\s*[=:]\s*\S+/gi,
];

export function accessSecretConfigured(): boolean {
  const secret = envString("APP_ACCESS_SECRET")?.trim();
  if (!secret) return false;
  if (hostedOnVercel() && secret.length < 12) return false;
  return true;
}

export function getOpenAiApiKey(): string | null {
  if (hostedOnVercel() && !accessSecretConfigured()) {
    return null;
  }
  const key = envString("OPENAI_API_KEY")?.trim();
  return key || null;
}

export function hasServerKey(): boolean {
  return Boolean(getOpenAiApiKey());
}

export function openaiClient(apiKey: string) {
  return createOpenAI({ apiKey });
}

export function resolveModel(value: string | undefined): ModelId {
  if (value && isModelId(value)) return value;
  return DEFAULT_MODEL;
}

export function jsonError(message: string, status: number): Response {
  return Response.json(
    { error: redactSecrets(message) },
    { status, headers: NO_STORE },
  );
}

export function jsonOk(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE });
}

export function missingKeyResponse() {
  return jsonError("Couldn't do that right now.", 503);
}

export function redactSecrets(value: string): string {
  let message = value;
  for (const secret of [
    envString("OPENAI_API_KEY"),
    envString("APP_ACCESS_SECRET"),
    ...(envString("APPROVED_ACCESS_CODES") ?? "").split(/[\n,]/),
  ]) {
    const trimmed = secret?.trim();
    if (trimmed) message = message.split(trimmed).join("[redacted]");
  }
  for (const pattern of SECRET_PATTERNS) {
    message = message.replace(pattern, "[redacted]");
  }
  if (message.length > 280) return `${message.slice(0, 280)}…`;
  return message;
}

export function toErrorMessage(error: unknown): string {
  void error;
  return "Couldn't do that right now.";
}
