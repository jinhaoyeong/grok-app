import { generateText, Output } from "ai";
import {
  missingKeyResponse,
  openaiClient,
  resolveApiKey,
  resolveModel,
  toErrorMessage,
} from "@/lib/openai-server";
import { replyRequestSchema, replyResultSchema } from "@/lib/schemas";

export const maxDuration = 60;

export async function POST(request: Request) {
  const apiKey = resolveApiKey(request);
  if (!apiKey) return missingKeyResponse();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = replyRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Paste the message first." }, { status: 400 });
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
      return Response.json(
        { error: "The model returned no replies." },
        { status: 502 },
      );
    }

    return Response.json(output);
  } catch (error) {
    return Response.json({ error: toErrorMessage(error) }, { status: 502 });
  }
}
