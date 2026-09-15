import { generateText, Output } from "ai";
import {
  missingKeyResponse,
  openaiClient,
  resolveApiKey,
  resolveModel,
  toErrorMessage,
} from "@/lib/openai-server";
import {
  dayBriefSchema,
  dayDinnerSchema,
  dayRequestSchema,
  dayWrapSchema,
} from "@/lib/schemas";

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

  const parsed = dayRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "That day request was incomplete." }, { status: 400 });
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
        return Response.json({ error: "No brief came back." }, { status: 502 });
      }
      return Response.json(output);
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
        return Response.json({ error: "No dinner came back." }, { status: 502 });
      }
      return Response.json(output);
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
      return Response.json({ error: "No wrap came back." }, { status: 502 });
    }
    return Response.json(output);
  } catch (error) {
    return Response.json({ error: toErrorMessage(error) }, { status: 502 });
  }
}
