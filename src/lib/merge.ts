import { createId } from "@/lib/ids";
import type { Board, ExtractedBoard } from "@/lib/types";

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function toBoardPatch(extracted: ExtractedBoard, now = new Date()): Board {
  const createdAt = now.toISOString();
  return {
    tasks: extracted.tasks.map((task) => ({
      ...task,
      id: createId("task"),
      done: false,
      createdAt,
    })),
    groceries: extracted.groceries.map((item) => ({
      ...item,
      id: createId("groc"),
      checked: false,
    })),
    events: extracted.events.map((item) => ({
      ...item,
      id: createId("event"),
    })),
    drafts: extracted.drafts.map((item) => ({
      ...item,
      id: createId("draft"),
    })),
    meals: extracted.meals.map((item) => ({
      ...item,
      id: createId("meal"),
    })),
    notes: extracted.notes.map((item) => ({
      ...item,
      id: createId("note"),
    })),
  };
}

export function mergeBoard(board: Board, incoming: Board): Board {
  const taskTitles = new Set(board.tasks.map((task) => norm(task.title)));
  const groceryNames = new Set(board.groceries.map((item) => norm(item.name)));

  return {
    tasks: [
      ...incoming.tasks.filter((task) => !taskTitles.has(norm(task.title))),
      ...board.tasks,
    ],
    groceries: [
      ...board.groceries,
      ...incoming.groceries.filter((item) => !groceryNames.has(norm(item.name))),
    ],
    events: [...incoming.events, ...board.events],
    drafts: [...incoming.drafts, ...board.drafts],
    meals: [...incoming.meals, ...board.meals],
    notes: [...incoming.notes, ...board.notes],
  };
}

export function countOpen(board: Board): { tasks: number; groceries: number } {
  return {
    tasks: board.tasks.filter((task) => !task.done).length,
    groceries: board.groceries.filter((item) => !item.checked).length,
  };
}
