import { globalScene } from "#app/global-scene";
import { modifierTypes } from "#data/data-lists";
import { getTrainerOffensiveStat, getTrainerRole, getTrainerStrength } from "#data/trainer-strength";
import { ModifierTier } from "#enums/modifier-tier";
import { MoveCategory } from "#enums/move-category";
import { Stat } from "#enums/stat";
import type { EnemyPokemon } from "#field/pokemon";
import { BaseStatModifier, PokemonHeldItemModifier } from "#modifiers/modifier";
import { ModifierTypeGenerator } from "#modifiers/modifier-type";

/** Guaranteed useful equipment, in addition to the normal trainer-specific/random items. */
export function getTrainerLoadout(pokemon: EnemyPokemon): PokemonHeldItemModifier[] {
  const profile = getTrainerStrength();
  if (!profile) {
    return [];
  }
  const result: PokemonHeldItemModifier[] = [];
  const add = (id: keyof typeof modifierTypes, stacks: number, args?: number[]) => {
    const factory = modifierTypes[id];
    let type = factory().withIdFromFunc(factory);
    if (type instanceof ModifierTypeGenerator) {
      const generated = type.generateType([pokemon], args);
      if (!generated) {
        return;
      }
      type = generated;
      type.id = id;
    }
    const item = type.newModifier(pokemon) as PokemonHeldItemModifier;
    item.stackCount = Math.min(stacks, item.getMaxHeldItemCount(pokemon));
    if (item.stackCount > 0) {
      result.push(item);
    }
  };
  const stacks = profile.vitaminStacks;
  const midgame = profile.wave >= 95 && profile.wave < 145;
  for (const stat of [Stat.HP, Stat.DEF, Stat.SPDEF, Stat.SPD]) {
    add("BASE_STAT_BOOSTER", stacks, [stat]);
  }
  add("BASE_STAT_BOOSTER", stacks + (profile.boss && profile.wave >= 145 ? 1 : 0), [getTrainerOffensiveStat(pokemon)]);
  const attackTypes = new Set(
    pokemon
      .getMoveset()
      .map(m => m.getMove())
      .filter(m => m.category !== MoveCategory.STATUS)
      .map(m => m.type),
  );
  for (const type of [...attackTypes].slice(0, 2)) {
    add("ATTACK_TYPE_BOOSTER", midgame ? 1 : 1 + Math.floor(profile.stage / 2) + Number(profile.boss), [type]);
  }
  if (profile.stage >= 1 || profile.boss) {
    if (!midgame || getTrainerRole(pokemon) === "tank") {
      add("LEFTOVERS", !midgame && profile.boss && profile.stage >= 2 ? 2 : 1);
    }
    add("WIDE_LENS", !midgame && profile.boss ? 2 : 1);
  }
  if (profile.stage >= 2 || (profile.boss && profile.stage >= 1)) {
    if (!midgame || getTrainerRole(pokemon) !== "tank") {
      add("SHELL_BELL", midgame || getTrainerRole(pokemon) === "tank" ? 1 : 2);
    }
    add("SCOPE_LENS", 1);
  }
  return result;
}

/** Also cap random/special loadouts, so they cannot undo the middle-game reduction. */
export function limitMidgameTrainerItems(pokemon: EnemyPokemon): void {
  const profile = getTrainerStrength();
  if (!profile || profile.wave < 95 || profile.wave >= 145) {
    return;
  }
  const preferredHealing = getTrainerRole(pokemon) === "tank" ? "LEFTOVERS" : "SHELL_BELL";
  for (const modifier of globalScene.findModifiers(() => true, false)) {
    if (!(modifier instanceof PokemonHeldItemModifier) || modifier.pokemonId !== pokemon.id) {
      continue;
    }
    if (modifier instanceof BaseStatModifier) {
      modifier.stackCount = Math.min(modifier.stackCount, profile.vitaminStacks);
    }
    if (modifier.type.tier >= ModifierTier.ULTRA) {
      modifier.stackCount = Math.min(modifier.stackCount, 1);
    }
    if (["LEFTOVERS", "SHELL_BELL"].includes(modifier.type.id) && modifier.type.id !== preferredHealing) {
      modifier.stackCount = 0;
    }
  }
}
