import { globalScene } from "#app/global-scene";
import { modifierTypes } from "#data/data-lists";
import {
  getTrainerBaseStats,
  getTrainerOffensiveStat,
  getTrainerRole,
  getTrainerStrength,
} from "#data/trainer-strength";
import { BattleType } from "#enums/battle-type";
import { GameModes } from "#enums/game-modes";
import { ModifierTier } from "#enums/modifier-tier";
import { MoveCategory } from "#enums/move-category";
import { Stat } from "#enums/stat";
import type { EnemyPokemon } from "#field/pokemon";
import { BaseStatModifier, HitHealModifier, PokemonHeldItemModifier, TurnHealModifier } from "#modifiers/modifier";
import { ModifierTypeGenerator } from "#modifiers/modifier-type";

/** Pick one specialist per role using raw fusion stats, independent of HP, items and field order. */
export function getTrainerHealingItem(pokemon: EnemyPokemon): "LEFTOVERS" | "SHELL_BELL" | undefined {
  const tank = getTrainerRole(pokemon) === "tank";
  const candidates = globalScene
    .getEnemyParty()
    .filter(p =>
      tank
        ? getTrainerRole(p) === "tank"
        : getTrainerRole(p) !== "tank" && p.getMoveset().some(m => m.getMove().category !== MoveCategory.STATUS),
    );
  const score = (p: EnemyPokemon) => {
    const stats = getTrainerBaseStats(p);
    return tank ? stats[Stat.HP] * (stats[Stat.DEF] + stats[Stat.SPDEF]) : stats[getTrainerOffensiveStat(p)];
  };
  candidates.sort((a, b) => score(b) - score(a) || a.id - b.id);
  return candidates[0]?.id === pokemon.id ? (tank ? "LEFTOVERS" : "SHELL_BELL") : undefined;
}

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
  const healingItem = getTrainerHealingItem(pokemon);
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
    if (healingItem === "LEFTOVERS") {
      add("LEFTOVERS", !midgame && profile.boss && profile.stage >= 2 ? 2 : 1);
    }
    add("WIDE_LENS", !midgame && profile.boss ? 2 : 1);
  }
  if (profile.stage >= 2 || (profile.boss && profile.stage >= 1)) {
    if (healingItem === "SHELL_BELL") {
      add("SHELL_BELL", midgame ? 1 : 2);
    }
    add("SCOPE_LENS", 1);
  }
  return result;
}

/** Enforce healing limits on all NPC sources, including random items and restored saves. */
export function limitTrainerItems(pokemon: EnemyPokemon): void {
  if (globalScene.currentBattle.battleType !== BattleType.TRAINER || globalScene.gameMode.modeId === GameModes.PVP) {
    return;
  }
  const profile = getTrainerStrength();
  const midgame = !!profile && profile.wave >= 95 && profile.wave < 145;
  const preferredHealing = getTrainerHealingItem(pokemon);
  let healingBudget = midgame ? 1 : 2;
  for (const modifier of globalScene.findModifiers(() => true, false)) {
    if (!(modifier instanceof PokemonHeldItemModifier) || modifier.pokemonId !== pokemon.id) {
      continue;
    }
    if (midgame && modifier instanceof BaseStatModifier) {
      modifier.stackCount = Math.min(modifier.stackCount, profile.vitaminStacks);
    }
    if (midgame && modifier.type.tier >= ModifierTier.ULTRA) {
      modifier.stackCount = Math.min(modifier.stackCount, 1);
    }
    const healingItem =
      modifier instanceof TurnHealModifier
        ? "LEFTOVERS"
        : modifier instanceof HitHealModifier
          ? "SHELL_BELL"
          : undefined;
    if (healingItem) {
      modifier.stackCount = healingItem === preferredHealing ? Math.min(modifier.stackCount, healingBudget) : 0;
      healingBudget -= modifier.stackCount;
    }
  }
}
