import { generateText, Output } from "ai";
import { readJsonBody, requireAiAccess } from "@/lib/api-guard";
import { parseDataUrl } from "@/lib/image";
import {
  getOpenAiApiKey,
  jsonError,
  jsonOk,
  missingKeyResponse,
  openaiClient,
  resolveModel,
  toErrorMessage,
} from "@/lib/openai-server";
import { extractedBoardSchema, sortRequestSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 6_500_000;

export async function POST(request: Request) {
  const blocked = await requireAiAccess(request, { maxBytes: MAX_BYTES });
  if (blocked) return blocked;

  const apiKey = getOpenAiApiKey();
  if (!apiKey) return missingKeyResponse();

  const bodyRead = await readJsonBody(request, MAX_BYTES);
  if (!bodyRead.ok) return bodyRead.response;

  const parsed = sortRequestSchema.safeParse(bodyRead.value);
  if (!parsed.success) {
    return jsonError("Check the dump and try again.", 400);
  }

  const body = parsed.data;
  if (!body.text.trim() && !body.image) {
    return jsonError("Type something or add a photo first.", 400);
  }

  const image = body.image ? parseDataUrl(body.image) : null;
  if (body.image && !image) {
    return jsonError("That photo could not be read.", 400);
  }

  const modelId = resolveModel(body.model);
  const openai = openaiClient(apiKey);
  const now = body.nowIso ?? new Date().toISOString();
  const timeZone = body.timeZone ?? "UTC";
  const name = body.profile?.name?.trim();
  const context = body.profile?.context?.trim();
  const voice = body.profile?.voice?.trim();
  const existingTasks = body.existing?.tasks?.join("; ") || "none";
  const existingGroceries = body.existing?.groceries?.join("; ") || "none";

  const instructions = [
    "You are Sorted, a daily-life clerk.",
    "Turn messy dumps, screenshots, fridge photos, receipts, and chat paste into a usable board.",
    "Do not invent chores, groceries, or events that are not implied.",
    "Prefer fewer, sharper items. Merge duplicates. Titles should be verbs when they are tasks.",
    "If you see food in a photo, suggest 1-2 meals they can actually cook from it.",
    "If you see a message thread, extract the ask and draft a reply they can send.",
    "If you see a receipt, pull the store, total into spends, and anything they might need to follow up on.",
    "Keep grocery names short and shoppable.",
    `Right now: ${now} (${timeZone}).`,
    name ? `The person's name is ${name}.` : "",
    context ? `Life context: ${context}` : "",
    voice ? `Write drafts in this voice: ${voice}` : "Write drafts like a normal text.",
    `Already on their task list: ${existingTasks}`,
    `Already on their grocery list: ${existingGroceries}`,
    "Skip items that are clearly already listed unless the dump changes them.",
  ]
    .filter(Boolean)
    .join("\n");

  const promptText = body.text.trim()
    ? body.text.trim()
    : "There is no text. Use the photo.";

  try {
    const { output } = await generateText({
      model: openai(modelId),
      instructions,
      output: Output.object({
        name: "SortedBoard",
        description: "Structured daily-life items extracted from a dump.",
        schema: extractedBoardSchema,
      }),
      messages: [
        {
          role: "user",
          content: image
            ? [
                { type: "text" as const, text: promptText },
                {
                  type: "file" as const,
                  mediaType: image.mediaType,
                  data: image.data,
                },
              ]
            : promptText,
        },
      ],
    });

    if (!output) {
      return jsonError("The model returned an empty board.", 502);
    }

    return jsonOk(output);
  } catch (error) {
    return jsonError(toErrorMessage(error), 502);
  }
}
