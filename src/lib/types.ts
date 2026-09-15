import type { ModelId } from "@/lib/models";

export type Priority = "now" | "today" | "later";

export type Task = {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  priority: Priority;
  done: boolean;
  createdAt: string;
  doneAt?: string;
};

export type Grocery = {
  id: string;
  name: string;
  qty?: string;
  checked: boolean;
};

export type EventItem = {
  id: string;
  title: string;
  when: string;
  where?: string;
};

export type Draft = {
  id: string;
  to?: string;
  purpose: string;
  text: string;
};

export type Meal = {
  id: string;
  name: string;
  why: string;
  steps: string[];
};

export type Note = {
  id: string;
  text: string;
};

export type Board = {
  tasks: Task[];
  groceries: Grocery[];
  events: EventItem[];
  drafts: Draft[];
  meals: Meal[];
  notes: Note[];
};

export type Cadence = "daily" | "weekdays" | "weekends";

export type Habit = {
  id: string;
  title: string;
  cadence: Cadence;
};

export type Spend = {
  id: string;
  amount: number;
  note: string;
  createdAt: string;
};

export type DinnerLog = {
  name: string;
  why?: string;
  steps?: string[];
  source: "list" | "ai" | "manual";
};

export type DayLog = {
  date: string;
  habitDone: Record<string, boolean>;
  spends: Spend[];
  dinner?: DinnerLog;
  brief?: string;
  wrap?: string;
  closedAt?: string;
  energy?: "low" | "ok" | "high";
};

export type Life = {
  habits: Habit[];
  days: Record<string, DayLog>;
};

export type Profile = {
  name: string;
  context: string;
  voice: string;
};

export type Settings = {
  apiKey: string;
  model: ModelId;
  profile: Profile;
  currency: string;
};

export type ExtractedBoard = {
  summary: string;
  tasks: Array<Omit<Task, "id" | "done" | "createdAt" | "doneAt">>;
  groceries: Array<Omit<Grocery, "id" | "checked">>;
  events: Array<Omit<EventItem, "id">>;
  drafts: Array<Omit<Draft, "id">>;
  meals: Array<Omit<Meal, "id">>;
  notes: Array<Omit<Note, "id">>;
  spends: Array<{ amount: number; note: string }>;
};

export type ReplyResult = {
  readsAs: string;
  replies: Array<{
    tone: "short" | "warm" | "direct";
    text: string;
  }>;
};

export type DecideResult = {
  pick: string;
  why: string;
  ifWrong: string;
  firstStep: string;
};

export type DayBrief = {
  headline: string;
  moves: string[];
};

export type DayDinner = {
  name: string;
  why: string;
  steps: string[];
};

export type DayWrap = {
  wrap: string;
  tomorrow: string;
};

export type TabId = "today" | "dump" | "reply" | "decide" | "settings";
