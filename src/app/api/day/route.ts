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
import {
  dayBriefSchema,
  dayDinnerSchema,
  dayRequestSchema,
  dayWrapSchema,
} from "@/lib/schemas";

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

  const parsed = dayRequestSchema.safeParse(bodyRead.value);
  if (!parsed.success) {
    return jsonError("That day request was incomplete.", 400);
  }

  const body = parsed.data;
  const openai = openaiClient(apiKey);
  const model = openai(resolveModel(body.model));
  const now = body.nowIso ?? new Date().toISOString();
  const timeZone = body.timeZone ?? "UTC";
  const name = body.profile?.name?.trim();
  const context = body.profile?.context?.trim();
  const energy = body.energy ?? "ok";
  const openTasks = body.tasks.filter((task) => !task.done);
  const leftoverHabits = body.habits.filter((habit) => !habit.done);
  const groceries = body.groceries.join(", ") || "none listed";
  const spent = body.spends
    .map((spend) => `${body.currency}${spend.amount} ${spend.note}`)
    .join("; ") || "nothing logged";
  const drafts = body.drafts.join("; ") || "none";

  const common = [
    "You are Sorted, a daily clerk for one person's real life.",
    "Be specific. Use their actual items. No motivational quotes.",
    `Right now: ${now} (${timeZone}). Energy: ${energy}.`,
    name ? `Name: ${name}.` : "",
    context ? `Life context: ${context}` : "",
    `Open tasks: ${openTasks.map((task) => `[${task.priority}] ${task.title}`).join("; ") || "none"}`,
    `Unchecked daily items: ${leftoverHabits.map((habit) => habit.title).join("; ") || "all done"}`,
    `Food on the list: ${groceries}`,
    `Spent today: ${spent}`,
    `Unsent drafts: ${drafts}`,
    body.dinner ? `Dinner already chosen: ${body.dinner}` : "Dinner not chosen yet.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    if (body.action === "brief") {
      const { output } = await generateText({
        model,
        instructions: `${common}\nPlan the next 90 minutes only. Start with whatever is actually due.`,
        output: Output.object({
          name: "DayBrief",
          description: "A short plan for the next stretch of today.",
          schema: dayBriefSchema,
        }),
        prompt: "Write today's next-stretch brief.",
      });
      if (!output) {
        return jsonError("No brief came back.", 502);
      }
      return jsonOk(output);
    }

    if (body.action === "dinner") {
      const { output } = await generateText({
        model,
        instructions: `${common}\nPick ONE dinner they can cook in under 30 minutes from the grocery list. If the list is empty, pick a tired-person default using pantry basics.`,
        output: Output.object({
          name: "DayDinner",
          description: "One cookable dinner for tonight.",
          schema: dayDinnerSchema,
        }),
        prompt: "What should they cook tonight?",
      });
      if (!output) {
        return jsonError("No dinner came back.", 502);
      }
      return jsonOk(output);
    }

    const { output } = await generateText({
      model,
      instructions: `${common}\nClose the day. Be honest about what is still open. Name tomorrow's first move.`,
      output: Output.object({
        name: "DayWrap",
        description: "An evening close for the day.",
        schema: dayWrapSchema,
      }),
      prompt: "Write the wrap for today.",
    });
    if (!output) {
      return jsonError("No wrap came back.", 502);
    }
    return jsonOk(output);
  } catch (error) {
    return jsonError(toErrorMessage(error), 502);
  }
}
