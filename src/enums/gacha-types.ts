import type { ObjectValues } from "#types/type-helpers";

export const GachaType = Object.freeze({
  MOVE: 0,
  LEGENDARY: 1,
  SHINY: 2,
  UNLOCK: 3,
});

export type GachaType = ObjectValues<typeof GachaType>;
