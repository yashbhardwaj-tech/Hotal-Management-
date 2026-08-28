// utils/portions.ts

/* =========================================================
   PORTIONS
   A dish is either single-size (its own `price`) or comes in
   named sizes — Half / Full being the common case, but the
   label is free text so "Small / Large" or "250g / 500g"
   work too.
========================================================= */

export interface Portion {
  label: string;
  price: number;
}

export interface PortionedFood {
  price: number;
  portions?: Portion[];
}

/** Valid, non-empty portions only — bad rows are ignored. */
export const getPortions = (food: PortionedFood | undefined): Portion[] => {
  if (!food || !Array.isArray(food.portions)) return [];

  return food.portions
    .filter(
      (portion): portion is Portion =>
        Boolean(portion) &&
        typeof portion.label === "string" &&
        portion.label.trim().length > 0 &&
        Number(portion.price) > 0,
    )
    .map((portion) => ({
      label: portion.label.trim(),
      price: Number(portion.price),
    }));
};

export const hasPortions = (food: PortionedFood | undefined): boolean =>
  getPortions(food).length > 0;

/** What the menu card shows before a size is chosen. */
export const startingPrice = (food: PortionedFood): number => {
  const portions = getPortions(food);

  if (portions.length === 0) return Number(food.price || 0);

  return Math.min(...portions.map((portion) => portion.price));
};

/**
 * Cart key. Half and Full of the same dish are separate lines,
 * so the food id alone is not enough.
 */
export const lineId = (foodId: string, portionLabel?: string): string =>
  portionLabel ? `${foodId}::${portionLabel}` : foodId;

export const DEFAULT_PORTION_LABELS = ["Half", "Full"];