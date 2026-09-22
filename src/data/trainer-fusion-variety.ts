import { speciesDataRegistry } from "#app/global-species-data-registry";
import { type TrainerFusionBuild, trainerFusionPools } from "#data/trainer-fusion-pools";
import { AbilityId } from "#enums/ability-id";
import { SpeciesId } from "#enums/species-id";
import { TrainerType } from "#enums/trainer-type";

/** Ordinary species anchors for 18 themes; donors may come from any theme. */
export const trainerFusionVarietyGroups: readonly (readonly [SpeciesId, SpeciesId, SpeciesId])[] = [
  [SpeciesId.PIDGEOT, SpeciesId.FEAROW, SpeciesId.NOCTOWL],
  [SpeciesId.NINETALES, SpeciesId.RAPIDASH, SpeciesId.MAGMAR],
  [SpeciesId.GOLDUCK, SpeciesId.SEAKING, SpeciesId.WHISCASH],
  [SpeciesId.RAICHU, SpeciesId.ELECTABUZZ, SpeciesId.LANTURN],
  [SpeciesId.VILEPLUME, SpeciesId.VICTREEBEL, SpeciesId.BELLOSSOM],
  [SpeciesId.DEWGONG, SpeciesId.GLALIE, SpeciesId.PILOSWINE],
  [SpeciesId.PRIMEAPE, SpeciesId.HITMONCHAN, SpeciesId.HITMONTOP],
  [SpeciesId.ARBOK, SpeciesId.MUK, SpeciesId.SWALOT],
  [SpeciesId.SANDSLASH, SpeciesId.DONPHAN, SpeciesId.CLAYDOL],
  [SpeciesId.PELIPPER, SpeciesId.SWELLOW, SpeciesId.XATU],
  [SpeciesId.HYPNO, SpeciesId.GRUMPIG, SpeciesId.CHIMECHO],
  [SpeciesId.BUTTERFREE, SpeciesId.VENOMOTH, SpeciesId.MASQUERAIN],
  [SpeciesId.GOLEM, SpeciesId.SUDOWOODO, SpeciesId.MAGCARGO],
  [SpeciesId.BANETTE, SpeciesId.DUSCLOPS, SpeciesId.MISDREAVUS],
  [SpeciesId.ALTARIA, SpeciesId.DRAGONAIR, SpeciesId.SHELGON],
  [SpeciesId.MIGHTYENA, SpeciesId.CACTURNE, SpeciesId.ABSOL],
  [SpeciesId.MAWILE, SpeciesId.METANG, SpeciesId.FORRETRESS],
  [SpeciesId.CLEFABLE, SpeciesId.WIGGLYTUFF, SpeciesId.GRANBULL],
];

export function getTrainerVarietyPoolSize(type: TrainerType): number {
  if (!trainerFusionPools[type]) {
    return 0;
  }
  if (type >= TrainerType.RIVAL && type <= TrainerType.RIVAL_6) {
    return 60;
  }
  return type >= TrainerType.BROCK && type <= TrainerType.GRUSHA ? 20 : 30;
}

export function getTrainerVarietyPool(type: TrainerType, wave: number): TrainerFusionBuild[] {
  const original = trainerFusionPools[type];
  if (!original) {
    return [];
  }
  const rival = type >= TrainerType.RIVAL && type <= TrainerType.RIVAL_6;
  const themes = new Set(original.map(build => speciesDataRegistry.getPokemonSpeciesForm(build[0], 0).type1));
  const species = trainerFusionVarietyGroups.flat();
  const candidates: { build: TrainerFusionBuild; role: number; order: number }[] = [];
  const seen = new Set<string>();
  for (const primary of species) {
    const a = speciesDataRegistry.getPokemonSpeciesForm(primary, 0);
    if (!rival && ![a.type1, a.type2].some(t => t != null && themes.has(t))) {
      continue;
    }
    for (const donor of species) {
      const pairKey = [primary, donor].sort((x, y) => x - y).join("/");
      if (primary === donor || seen.has(pairKey)) {
        continue;
      }
      const b = speciesDataRegistry.getPokemonSpeciesForm(donor, 0);
      const stats = a.baseStats.map((value, stat) => Math.max(value, b.baseStats[stat]));
      const total = stats.reduce((sum, value) => sum + value, 0);
      if (total > (wave < 145 ? 600 : 650)) {
        continue;
      }
      seen.add(pairKey);
      // Keep the parents' ordinary abilities, supplemented only by modest utility passives.
      const abilities = [
        ...new Set([
          a.ability1,
          b.ability1,
          AbilityId.KEEN_EYE,
          AbilityId.OWN_TEMPO,
          AbilityId.INNER_FOCUS,
          AbilityId.BATTLE_ARMOR,
        ]),
      ];
      const offense = Math.max(stats[1], stats[3]);
      const role = (stats[2] + stats[4]) / 2 >= offense ? 0 : stats[5] >= 85 ? 1 : 2;
      // Stable per-trainer ordering, without consuming the battle RNG.
      let hash = Math.imul(type + 1, 73856093) ^ Math.imul(primary, 19349663) ^ Math.imul(donor, 83492791);
      hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
      candidates.push({
        build: [primary, donor, abilities[0], abilities[2], abilities[1], abilities[3]],
        role,
        order: (hash ^ (hash >>> 16)) >>> 0,
      });
    }
  }
  candidates.sort((a, b) => a.order - b.order);
  const builds: TrainerFusionBuild[] = [];
  const usage = new Map<SpeciesId, number>();
  const roles = [0, 0, 0];
  // Spread slots over parents and tank/fast-attacker/breaker roles, instead of filling
  // a nominally large pool with reversed pairs or the same donor on every build.
  while (builds.length < getTrainerVarietyPoolSize(type) && candidates.length > 0) {
    const penalty = (candidate: (typeof candidates)[number]) =>
      (usage.get(candidate.build[0]) ?? 0) + (usage.get(candidate.build[1]) ?? 0) + roles[candidate.role] * 2;
    let selected = 0;
    for (let i = 1; i < candidates.length; i++) {
      if (penalty(candidates[i]) < penalty(candidates[selected])) {
        selected = i;
      }
    }
    const candidate = candidates.splice(selected, 1)[0];
    builds.push(candidate.build);
    for (const id of [candidate.build[0], candidate.build[1]]) {
      usage.set(id, (usage.get(id) ?? 0) + 1);
    }
    roles[candidate.role]++;
  }
  return builds;
}
