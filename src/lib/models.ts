export const MODELS = ["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol"] as const;

export type ModelId = (typeof MODELS)[number];

export const DEFAULT_MODEL: ModelId = "gpt-5.6-luna";

export const MODEL_COPY: Record<
  ModelId,
  { label: string; hint: string }
> = {
  "gpt-5.6-luna": {
    label: "Luna",
    hint: "Cheap daily driver. Best default so credit lasts.",
  },
  "gpt-5.6-terra": {
    label: "Terra",
    hint: "Sharper on messy photos and long dumps.",
  },
  "gpt-5.6-sol": {
    label: "Sol",
    hint: "Heavy model. Use when the dump is actually hard.",
  },
};

export function isModelId(value: string): value is ModelId {
  return (MODELS as readonly string[]).includes(value);
}
