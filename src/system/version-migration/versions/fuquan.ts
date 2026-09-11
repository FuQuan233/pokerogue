import { SpeciesId } from "#enums/species-id";
import type { SessionSaveMigrator } from "#types/save-migrators";

/** Preserve private random-stat rolls when upstream splits forms into species. */
export const migrateFuquanRandomStats: SessionSaveMigrator = {
  name: "migrateFuquanRandomStats",
  version: "1.12.0.0",
  migrate: data => {
    if (!Array.isArray(data.randomizedStats)) {
      return;
    }
    const monoGen = Array.isArray(data.challenges) ? data.challenges.find(c => c?.id === 0)?.value : undefined;
    const entries: [string, number[]][] = data.randomizedStats.filter(
      (entry): entry is [string, number[]] =>
        Array.isArray(entry) && typeof entry[0] === "string" && Array.isArray(entry[1]),
    );
    const rolls = new Map(entries);
    for (const [key, stats] of entries) {
      const [species, form] = key.split("-").map(Number);
      let target: string | undefined;
      if ([SpeciesId.FROAKIE, SpeciesId.FROGADIER, SpeciesId.GRENINJA].includes(species) && form > 0) {
        target = `${monoGen === 6 ? species : SpeciesId.BATTLE_BOND_GRENINJA}-0`;
      } else if (species === SpeciesId.BASCULIN && form === 2) {
        target = `${monoGen === 5 ? species : SpeciesId.HISUI_BASCULIN}-0`;
      }
      // Keep existing destination rolls and old keys for other party members.
      if (target && !rolls.has(target)) {
        rolls.set(target, stats);
      }
    }
    data.randomizedStats = [...rolls];
  },
};
