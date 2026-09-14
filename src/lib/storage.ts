import { DEFAULT_MODEL } from "@/lib/models";
import type { Board, Settings } from "@/lib/types";

const BOARD_KEY = "sorted.board.v1";
const SETTINGS_KEY = "sorted.settings.v1";

export const emptyBoard = (): Board => ({
  tasks: [],
  groceries: [],
  events: [],
  drafts: [],
  meals: [],
  notes: [],
});

export const defaultSettings = (): Settings => ({
  apiKey: "",
  model: DEFAULT_MODEL,
  profile: {
    name: "",
    context: "",
    voice: "Short, natural, like a text. No corporate tone.",
  },
});

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function loadBoard(): Board {
  if (!canUseStorage()) return emptyBoard();
  try {
    const raw = window.localStorage.getItem(BOARD_KEY);
    if (!raw) return emptyBoard();
    const parsed = JSON.parse(raw) as Partial<Board>;
    return {
      ...emptyBoard(),
      ...parsed,
      tasks: parsed.tasks ?? [],
      groceries: parsed.groceries ?? [],
      events: parsed.events ?? [],
      drafts: parsed.drafts ?? [],
      meals: parsed.meals ?? [],
      notes: parsed.notes ?? [],
    };
  } catch {
    return emptyBoard();
  }
}

export function saveBoard(board: Board): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(BOARD_KEY, JSON.stringify(board));
}

export function loadSettings(): Settings {
  if (!canUseStorage()) return defaultSettings();
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const defaults = defaultSettings();
    return {
      apiKey: parsed.apiKey ?? "",
      model: parsed.model ?? defaults.model,
      profile: {
        ...defaults.profile,
        ...parsed.profile,
      },
    };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings: Settings): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function exportBoardJson(board: Board): string {
  return JSON.stringify(board, null, 2);
}
