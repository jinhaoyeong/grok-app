import { z } from "zod";
import { MODELS } from "@/lib/models";

export const extractedBoardSchema = z.object({
  summary: z
    .string()
    .describe("One plain sentence of what you understood from the dump."),
  tasks: z.array(
    z.object({
      title: z.string().describe("Short action the person can do."),
      notes: z.string().optional().describe("Only if needed to do the task."),
      due: z
        .string()
        .optional()
        .describe("YYYY-MM-DD or a clock time if clearly stated."),
      priority: z.enum(["now", "today", "later"]),
    }),
  ),
  groceries: z.array(
    z.object({
      name: z.string(),
      qty: z.string().optional(),
    }),
  ),
  events: z.array(
    z.object({
      title: z.string(),
      when: z.string().describe("Human-readable time, include date if known."),
      where: z.string().optional(),
    }),
  ),
  drafts: z.array(
    z.object({
      to: z.string().optional().describe("Who the message is for."),
      purpose: z.string().describe("Why this draft exists."),
      text: z
        .string()
        .describe("Ready-to-send message in the user's voice. No quotes around it."),
    }),
  ),
  meals: z.array(
    z.object({
      name: z.string(),
      why: z.string().describe("Why this meal fits what they have or asked."),
      steps: z.array(z.string()).describe("Short cooking steps."),
    }),
  ),
  notes: z.array(
    z.object({
      text: z.string().describe("Anything useful that is not a task."),
    }),
  ),
});

export const replyResultSchema = z.object({
  readsAs: z
    .string()
    .describe("What the incoming message is actually asking or implying."),
  replies: z
    .array(
      z.object({
        tone: z.enum(["short", "warm", "direct"]),
        text: z.string().describe("Ready-to-send reply. No surrounding quotes."),
      }),
    )
    .min(1)
    .max(3),
});

export const decideResultSchema = z.object({
  pick: z.string().describe("The option to take, named clearly."),
  why: z.string().describe("Two or three sentences, practical, not pep-talk."),
  ifWrong: z
    .string()
    .describe("The specific situation where you would pick something else."),
  firstStep: z.string().describe("The next physical action in the next 10 minutes."),
});

export const profileSchema = z.object({
  name: z.string().max(80).optional().default(""),
  context: z.string().max(2000).optional().default(""),
  voice: z.string().max(500).optional().default(""),
});

export const sortRequestSchema = z.object({
  text: z.string().max(20000).optional().default(""),
  image: z.string().max(6_000_000).optional(),
  model: z.enum(MODELS).optional(),
  profile: profileSchema.optional(),
  existing: z
    .object({
      tasks: z.array(z.string().max(200)).max(80).optional(),
      groceries: z.array(z.string().max(120)).max(80).optional(),
    })
    .optional(),
  nowIso: z.string().max(40).optional(),
  timeZone: z.string().max(80).optional(),
});

export const replyRequestSchema = z.object({
  incoming: z.string().min(1).max(12000),
  want: z.string().max(2000).optional().default(""),
  model: z.enum(MODELS).optional(),
  profile: profileSchema.optional(),
});

export const decideRequestSchema = z.object({
  decision: z.string().min(1).max(2000),
  options: z.array(z.string().min(1).max(400)).min(2).max(6),
  constraints: z.string().max(2000).optional().default(""),
  model: z.enum(MODELS).optional(),
  profile: profileSchema.optional(),
});
