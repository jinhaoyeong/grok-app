export type QuickKind = "task" | "grocery" | "spend";

const MONEY = String.raw`(?:S\$|RM|€|£|\$)\s*`;

export function parseSpend(raw: string): { amount: number; note: string } | null {
  const trimmed = raw.trim();
  const leading = trimmed.match(new RegExp(`^(?:${MONEY})?(\\d+(?:\\.\\d{1,2})?)\\s+(.+)$`, "i"));
  if (leading) {
    const amount = Number(leading[1]);
    const note = leading[2].trim();
    if (Number.isFinite(amount) && amount > 0 && note) return { amount, note };
  }
  const trailing = trimmed.match(new RegExp(`^(.+?)\\s+(?:${MONEY})?(\\d+(?:\\.\\d{1,2})?)$`, "i"));
  if (trailing) {
    const note = trailing[1].trim();
    const amount = Number(trailing[2]);
    if (Number.isFinite(amount) && amount > 0 && note) return { amount, note };
  }
  return null;
}

export function parseAmountOnly(raw: string): number | null {
  const match = raw.trim().match(/^(?:(?:S\$|RM|€|£|\$)\s*)?(\d+(?:\.\d{1,2})?)$/);
  if (!match) return null;
  const amount = Number(match[1]);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

const GROCERY_HINT =
  /\b(milk|eggs?|bread|rice|chicken|tofu|spinach|onion|garlic|tomato|butter|coffee|tea|fruit|apple|banana|oat|yogurt|cheese|noodles?|pasta|oil|soy|toothpaste|detergent|soap)\b/i;

export function guessKind(raw: string, preferred: QuickKind): QuickKind {
  if (preferred !== "task") return preferred;
  if (parseSpend(raw)) return "spend";
  if (GROCERY_HINT.test(raw) && raw.split(/\s+/).length <= 4) return "grocery";
  return "task";
}
