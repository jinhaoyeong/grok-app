import { generateText, Output } from "ai";
import { readJsonBody, requireAiAccess } from "@/lib/api-guard";
import {
  getOpenAiApiKey,
  jsonError,
  jsonOk,
  missingKeyResponse,
  openaiClient,
  resolveModel,
  toErrorMessage,
} from "@/lib/openai-server";
import { replyRequestSchema, replyResultSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 100_000;

export async function POST(request: Request) {
  const blocked = await requireAiAccess(request, { maxBytes: MAX_BYTES });
  if (blocked) return blocked;

  const apiKey = getOpenAiApiKey();
  if (!apiKey) return missingKeyResponse();

  const bodyRead = await readJsonBody(request, MAX_BYTES);
  if (!bodyRead.ok) return bodyRead.response;

  const parsed = replyRequestSchema.safeParse(bodyRead.value);
  if (!parsed.success) {
    return jsonError("Paste the message first.", 400);
  }

  const body = parsed.data;
  const modelId = resolveModel(body.model);
  const openai = openaiClient(apiKey);
  const name = body.profile?.name?.trim();
  const voice = body.profile?.voice?.trim();
  const context = body.profile?.context?.trim();

  const instructions = [
    "You write replies people can actually send.",
    "Return three tones when possible: short, warm, and direct.",
    "No greetings unless the original used one. No emojis unless the original used them.",
    "Do not be a therapist. Do not over-apologize. Match the relationship implied by the message.",
    name ? `The sender's name is ${name}.` : "",
    voice ? `Voice: ${voice}` : "Voice: short texts, natural, not corporate.",
    context ? `Life context: ${context}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = [
    "Incoming message:",
    body.incoming.trim(),
    body.want.trim() ? `\nWhat I want this reply to do:\n${body.want.trim()}` : "",
  ].join("\n");

  try {
    const { output } = await generateText({
      model: openai(modelId),
      instructions,
      output: Output.object({
        name: "ReplyPack",
        description: "Three sendable replies to an incoming message.",
        schema: replyResultSchema,
      }),
      prompt,
    });

    if (!output) {
      return jsonError("The model returned no replies.", 502);
    }

    return jsonOk(output);
  } catch (error) {
    return jsonError(toErrorMessage(error), 502);
  }
}
