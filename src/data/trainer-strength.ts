import { globalScene } from "#app/global-scene";
import { BattleType } from "#enums/battle-type";
import { MoveCategory } from "#enums/move-category";
import { Nature } from "#enums/nature";
import { Stat } from "#enums/stat";
import type { EnemyPokemon, Pokemon } from "#field/pokemon";

/** Classic and its challenge variants only; never alters PvP or daily seeded rules. */
export function getTrainerStrength() {
  const battle = globalScene.currentBattle;
  if (!globalScene.gameMode?.isClassic || battle?.battleType !== BattleType.TRAINER || !battle.trainer) {
    return null;
  }
  const wave = battle.waveIndex;
  const boss = battle.trainer.config.isBoss;
  const stage = wave < 30 ? 0 : wave < 80 ? 1 : wave < 140 ? 2 : 3;
  return {
    wave,
    boss,
    stage,
    levelMultiplier: boss ? 1.1 : 1.05,
    vitaminStacks: 1 + stage + (boss ? 1 + Math.floor(stage / 2) : 0),
    ivFloor: boss ? 31 : 15 + stage * 5,
    eggLevel: boss ? 35 : 60,
    rareEggLevel: boss ? 100 : 150,
  };
}

export function getTrainerRole(pokemon: Pokemon): "fast" | "breaker" | "tank" {
  const stats = pokemon.getSpeciesForm().baseStats;
  if ((stats[Stat.DEF] + stats[Stat.SPDEF]) / 2 >= Math.max(stats[Stat.ATK], stats[Stat.SPATK])) {
    return "tank";
  }
  return stats[Stat.SPD] >= 85 ? "fast" : "breaker";
}

export function getTrainerOffensiveStat(pokemon: Pokemon): Stat.ATK | Stat.SPATK {
  const stats = pokemon.getSpeciesForm().baseStats;
  const attacks = pokemon
    .getMoveset()
    .map(m => m.getMove())
    .filter(m => m.category !== MoveCategory.STATUS);
  if (attacks.length > 0 && attacks.every(m => m.category === MoveCategory.PHYSICAL)) {
    return Stat.ATK;
  }
  if (attacks.length > 0 && attacks.every(m => m.category === MoveCategory.SPECIAL)) {
    return Stat.SPATK;
  }
  return stats[Stat.ATK] >= stats[Stat.SPATK] ? Stat.ATK : Stat.SPATK;
}

/** Called after custom party member functions, once, before the encounter is saved. */
export function strengthenTrainerPokemon(pokemon: EnemyPokemon, index: number, partySize: number): void {
  const profile = getTrainerStrength();
  if (!profile) {
    return;
  }
  pokemon.ivs = pokemon.ivs.map(iv => Math.max(iv, profile.ivFloor));
  const physical = getTrainerOffensiveStat(pokemon) === Stat.ATK;
  const role = getTrainerRole(pokemon);
  const stats = pokemon.getSpeciesForm().baseStats;
  const nature =
    role === "fast"
      ? physical
        ? Nature.JOLLY
        : Nature.TIMID
      : role === "tank"
        ? stats[Stat.DEF] >= stats[Stat.SPDEF]
          ? physical
            ? Nature.IMPISH
            : Nature.BOLD
          : physical
            ? Nature.CAREFUL
            : Nature.CALM
        : physical
          ? Nature.ADAMANT
          : Nature.MODEST;
  pokemon.setNature(nature);
  // Expand from the ace to the full boss team; ordinary late-game teams receive ace access.
  if ((profile.boss && profile.wave >= 100) || (profile.wave >= 60 && index === partySize - 1)) {
    pokemon.passive = true;
  }
  pokemon.calculateStats();
  pokemon.hp = pokemon.getMaxHp();
}
