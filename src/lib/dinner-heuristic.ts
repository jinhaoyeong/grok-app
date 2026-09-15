import type { DayDinner } from "@/lib/types";

export function tiredDinner(): DayDinner {
  return {
    name: "Eggs on toast, or instant noodles",
    why: "Nothing useful is on the list. This is the tired default so you do not open a delivery app.",
    steps: [
      "If you have eggs: scramble them onto toast.",
      "If you have noodles: boil, then add an egg or frozen veg if it exists.",
      "If you have neither: eat fruit and something salty, then put two items on the buy list.",
    ],
  };
}

export function dinnerFromGroceries(names: string[]): DayDinner {
  const list = names.map((name) => name.toLowerCase());
  if (!list.length) return tiredDinner();
  const has = (word: string) => list.some((name) => name.includes(word));
  const pantry = names.slice(0, 6).join(", ");

  if (has("egg") && (has("rice") || has("spinach") || has("onion"))) {
    return {
      name: "Egg fried rice",
      why: `Uses ${pantry || "what is already on the list"} and takes about 15 minutes.`,
      steps: [
        "Scramble eggs in a hot pan and set aside.",
        "Fry onion or leftover veg, then add cold rice.",
        "Return the eggs, season with soy or salt, eat hot.",
      ],
    };
  }

  if (has("chicken") || has("tofu")) {
    return {
      name: has("chicken") ? "Quick chicken bowl" : "Tofu pan bowl",
      why: `Protein is already on the list: ${pantry}.`,
      steps: [
        "Cut the protein small so it cooks fast.",
        "Pan with oil, salt, and any veg you have.",
        "Serve over rice or eat as is if you are tired.",
      ],
    };
  }

  if (has("noodle") || has("pasta")) {
    return {
      name: "One-pot noodles",
      why: "Carbs plus whatever veg is left is enough for tonight.",
      steps: [
        "Boil the noodles.",
        "Throw in chopped leftover veg for the last 2 minutes.",
        "Sauce with soy, butter, or the jar you already opened.",
      ],
    };
  }

  return {
    name: "Pan meal from the list",
    why: `Cook the first useful things you already wrote down: ${pantry}.`,
    steps: [
      "Pick two items from the grocery list.",
      "Cook the one that takes longest first.",
      "Season hard, eat, do not open a delivery app.",
    ],
  };
}
