import { generateText, Output } from "ai";
import { parseDataUrl } from "@/lib/image";
import {
  missingKeyResponse,
  openaiClient,
  resolveApiKey,
  resolveModel,
  toErrorMessage,
} from "@/lib/openai-server";
import { extractedBoardSchema, sortRequestSchema } from "@/lib/schemas";

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

  const parsed = sortRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Check the dump and try again." }, { status: 400 });
  }

  const body = parsed.data;
  if (!body.text.trim() && !body.image) {
    return Response.json(
      { error: "Type something or add a photo first." },
      { status: 400 },
    );
  }

  const image = body.image ? parseDataUrl(body.image) : null;
  if (body.image && !image) {
    return Response.json({ error: "That photo could not be read." }, { status: 400 });
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
      return Response.json(
        { error: "The model returned an empty board." },
        { status: 502 },
      );
    }

    return Response.json(output);
  } catch (error) {
    return Response.json({ error: toErrorMessage(error) }, { status: 502 });
  }
}
