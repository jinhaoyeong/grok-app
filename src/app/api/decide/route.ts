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
import { decideRequestSchema, decideResultSchema } from "@/lib/schemas";

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

  const parsed = decideRequestSchema.safeParse(bodyRead.value);
  if (!parsed.success) {
    return jsonError("Give a decision and at least two options.", 400);
  }

  const body = parsed.data;
  const modelId = resolveModel(body.model);
  const openai = openaiClient(apiKey);
  const name = body.profile?.name?.trim();
  const context = body.profile?.context?.trim();

  const instructions = [
    "You help with small daily decisions. Be decisive.",
    "Pick one option. Do not split the difference unless the person asked for a mix.",
    "Optimize for energy, time, money, and whether they will actually follow through tonight — not a perfect life plan.",
    "No motivational quotes. No listing every option again.",
    name ? `The person's name is ${name}.` : "",
    context ? `Life context: ${context}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = [
    `Decision: ${body.decision.trim()}`,
    `Options:\n${body.options.map((option, index) => `${index + 1}. ${option}`).join("\n")}`,
    body.constraints.trim()
      ? `Constraints / extra context:\n${body.constraints.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { output } = await generateText({
      model: openai(modelId),
      instructions,
      output: Output.object({
        name: "DailyDecision",
        description: "A single pick for a small daily decision.",
        schema: decideResultSchema,
      }),
      prompt,
    });

    if (!output) {
      return jsonError("The model did not pick anything.", 502);
    }

    return jsonOk(output);
  } catch (error) {
    return jsonError(toErrorMessage(error), 502);
  }
}
