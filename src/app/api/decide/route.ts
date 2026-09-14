import { generateText, Output } from "ai";
import {
  missingKeyResponse,
  openaiClient,
  resolveApiKey,
  resolveModel,
  toErrorMessage,
} from "@/lib/openai-server";
import { decideRequestSchema, decideResultSchema } from "@/lib/schemas";

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

  const parsed = decideRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Give a decision and at least two options." },
      { status: 400 },
    );
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
      return Response.json(
        { error: "The model did not pick anything." },
        { status: 502 },
      );
    }

    return Response.json(output);
  } catch (error) {
    return Response.json({ error: toErrorMessage(error) }, { status: 502 });
  }
}
