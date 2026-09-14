import { createOpenAI } from "@ai-sdk/openai";
import { DEFAULT_MODEL, isModelId, type ModelId } from "@/lib/models";

export function resolveApiKey(request: Request): string | null {
  const header = request.headers.get("x-openai-key")?.trim();
  if (header) return header;
  const envKey = process.env.OPENAI_API_KEY?.trim();
  return envKey || null;
}

export function hasServerKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function openaiClient(apiKey: string) {
  return createOpenAI({ apiKey });
}

export function resolveModel(value: string | undefined): ModelId {
  if (value && isModelId(value)) return value;
  return DEFAULT_MODEL;
}

export function missingKeyResponse() {
  return Response.json(
    {
      error:
        "Add your OpenAI API key in Settings, or set OPENAI_API_KEY on the server.",
    },
    { status: 401 },
  );
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message.replace(/sk-[a-zA-Z0-9_-]+/g, "sk-***");
  }
  return "The model did not return anything usable.";
}
