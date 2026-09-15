import type { DayLog, DinnerLog, Habit, Life, Spend } from "@/lib/types";
import { createId } from "@/lib/ids";

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftDateKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function dayPhase(
  date = new Date(),
): "morning" | "afternoon" | "evening" {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function weekdayIndex(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

export function isHabitDue(habit: Habit, dateKey: string): boolean {
  const weekday = weekdayIndex(dateKey);
  const isWeekend = weekday === 0 || weekday === 6;
  if (habit.cadence === "daily") return true;
  if (habit.cadence === "weekdays") return !isWeekend;
  return isWeekend;
}

export function defaultHabits(): Habit[] {
  return [
    { id: createId("habit"), title: "Drink water", cadence: "daily" },
    { id: createId("habit"), title: "Move (walk, stretch, gym)", cadence: "daily" },
    { id: createId("habit"), title: "Eat a real meal", cadence: "daily" },
    { id: createId("habit"), title: "One admin thing", cadence: "weekdays" },
  ];
}

export function emptyDay(date: string): DayLog {
  return {
    date,
    habitDone: {},
    spends: [],
  };
}

export function ensureDay(life: Life, dateKey: string): DayLog {
  return life.days[dateKey] ?? emptyDay(dateKey);
}

export function upsertDay(life: Life, day: DayLog): Life {
  const days = { ...life.days, [day.date]: day };
  const keys = Object.keys(days).sort();
  const keep = keys.slice(-60);
  const trimmed: Record<string, DayLog> = {};
  for (const key of keep) trimmed[key] = days[key];
  return { ...life, days: trimmed };
}

export function dueHabits(life: Life, dateKey: string): Habit[] {
  return life.habits.filter((habit) => isHabitDue(habit, dateKey));
}

export function habitsComplete(life: Life, dateKey: string): boolean {
  const due = dueHabits(life, dateKey);
  if (!due.length) return false;
  const day = ensureDay(life, dateKey);
  return due.every((habit) => day.habitDone[habit.id]);
}

export function spendTotal(spends: Spend[]): number {
  return spends.reduce((sum, spend) => sum + spend.amount, 0);
}

export function formatMoney(amount: number, currency: string): string {
  const rounded = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${currency}${rounded}`;
}

export function streakCount(life: Life, todayKey: string): number {
  let streak = 0;
  let cursor = habitsComplete(life, todayKey) ? todayKey : shiftDateKey(todayKey, -1);
  for (let i = 0; i < 60; i += 1) {
    if (!habitsComplete(life, cursor) && !ensureDay(life, cursor).closedAt) break;
    if (habitsComplete(life, cursor) || ensureDay(life, cursor).closedAt) {
      streak += 1;
      cursor = shiftDateKey(cursor, -1);
      continue;
    }
    break;
  }
  return streak;
}

export function localWrap(
  doneHabits: number,
  totalHabits: number,
  doneTasks: number,
  leftTasks: number,
  spent: string,
  dinner?: string,
): string {
  const dinnerBit = dinner ? `Dinner was ${dinner}.` : "Dinner was not logged.";
  return `${doneHabits}/${totalHabits} daily checks. ${doneTasks} tasks done, ${leftTasks} still open. Spent ${spent}. ${dinnerBit}`;
}

export function weekStrip(
  life: Life,
  todayKey: string,
): Array<{ key: string; label: string; done: boolean; isToday: boolean }> {
  return Array.from({ length: 7 }, (_, index) => {
    const key = shiftDateKey(todayKey, index - 6);
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return {
      key,
      label: date.toLocaleDateString(undefined, { weekday: "narrow" }),
      done: habitsComplete(life, key) || Boolean(ensureDay(life, key).closedAt),
      isToday: key === todayKey,
    };
  });
}

export function toSpends(
  incoming: Array<{ amount: number; note: string }>,
  at = new Date(),
): Spend[] {
  return incoming
    .filter(
      (spend) =>
        Number.isFinite(spend.amount) &&
        spend.amount > 0 &&
        spend.note.trim().length > 0,
    )
    .map((spend) => ({
      id: createId("spend"),
      amount: Math.round(spend.amount * 100) / 100,
      note: spend.note.trim(),
      createdAt: at.toISOString(),
    }));
}

export function applyDumpToLife(
  life: Life,
  extras: {
    spends: Array<{ amount: number; note: string }>;
    dinner?: DinnerLog;
  },
  dateKey = localDateKey(),
): Life {
  const day = ensureDay(life, dateKey);
  return upsertDay(life, {
    ...day,
    spends: [...toSpends(extras.spends), ...day.spends],
    dinner: day.dinner ?? extras.dinner,
  });
}

export function isoToLocalDateKey(iso: string): string {
  return localDateKey(new Date(iso));
}
