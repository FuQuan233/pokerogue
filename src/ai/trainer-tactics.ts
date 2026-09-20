import { globalScene } from "#app/global-scene";
import { allMoves } from "#data/data-lists";
import { getTrainerStrength } from "#data/trainer-strength";
import { getWeatherMoveId } from "#data/weather";
import { GameModes } from "#enums/game-modes";
import { MoveCategory } from "#enums/move-category";
import { MoveId } from "#enums/move-id";
import { MoveUseMode } from "#enums/move-use-mode";
import { Stat } from "#enums/stat";
import type { EnemyPokemon, Pokemon } from "#field/pokemon";
import type { Move } from "#moves/move";
import { getMoveTargets } from "#moves/move-utils";
import type { PokemonMove } from "#moves/pokemon-move";
import type { TurnMove } from "#types/turn-move";

function estimateDamage(source: Pokemon, target: Pokemon, move: Move): number {
  if (move.category === MoveCategory.STATUS || globalScene.arena.isMoveWeatherCancelled(source, move)) {
    return 0;
  }
  return target.getAttackDamage({
    source,
    move,
    simulated: true,
    ignoreAbility: !target.waveData.abilityRevealed,
    ignoreSourceAbility: false,
    ignoreAllyAbility: !target.getAlly()?.waveData.abilityRevealed,
    ignoreSourceAllyAbility: false,
    isCritical: move.hasAttr("CritOnlyAttr"),
  }).damage;
}

/** Uses only moves already revealed in combat, not the player's selected command or hidden moveset. */
export function getKnownIncomingDamage(pokemon: Pokemon): number {
  return pokemon
    .getOpponents()
    .filter(p => p.isActive(true))
    .reduce((sum, opponent) => {
      const revealed = [...new Set(opponent.getMoveHistory().map(m => m.move))]
        .map(id => allMoves[id])
        .filter(m => m && m.category !== MoveCategory.STATUS);
      const damage =
        revealed.length > 0
          ? Math.max(...revealed.map(m => estimateDamage(opponent, pokemon, allMoves[getWeatherMoveId(opponent, m)])))
          : pokemon.getMaxHp() * 0.3;
      return sum + damage;
    }, 0);
}

function goesFirst(user: Pokemon, target: Pokemon, move: Move): boolean {
  const knownPriority = Math.max(
    0,
    ...target
      .getMoveHistory()
      .map(m => allMoves[m.move])
      .filter(m => m && m.category !== MoveCategory.STATUS)
      .map(m => m.priority),
  );
  return (
    move.priority > knownPriority
    || (move.priority === knownPriority
      && user.getEffectiveStat(Stat.SPD, { opponent: target }) > target.getEffectiveStat(Stat.SPD, { opponent: user }))
  );
}

function scoreTarget(user: EnemyPokemon, target: Pokemon, move: Move, incoming: number): number {
  if (
    move.id === MoveId.SPLASH
    || move.isUnimplemented
    || globalScene.arena.isMoveWeatherCancelled(user, move)
    || globalScene.arena.isMoveTerrainCancelled(user, [target.getBattlerIndex()], move)
  ) {
    return -10000;
  }
  const conditionalPriority = [MoveId.SUCKER_PUNCH, MoveId.UPPER_HAND, MoveId.THUNDERCLAP].includes(move.id);
  if (!conditionalPriority && !move.applyConditions(user, target, -1)) {
    return -10000;
  }
  const opponent = target.isPlayer() !== user.isPlayer();
  const accuracy = move.accuracy < 0 ? 1 : Math.max(0, Math.min(1, move.accuracy / 100));
  if (move.category !== MoveCategory.STATUS) {
    const damage = estimateDamage(user, target, move);
    if (!opponent) {
      return (-160 * damage) / Math.max(1, target.hp);
    }
    if (!damage) {
      return -1000;
    }
    const first = goesFirst(user, target, move);
    let score = Math.min(damage / Math.max(1, target.hp), 1.5) * 100 * accuracy;
    if (damage >= target.hp) {
      score += (first ? 180 : 90) * accuracy;
    }
    if (!first && incoming >= user.hp) {
      score *= 0.2;
    }
    if (conditionalPriority) {
      score *= 0.7;
    }
    if (move.hasAttr("SacrificialAttr") || move.id === MoveId.MOONLIT_BLOODSTORM) {
      score -= move.id === MoveId.MOONLIT_BLOODSTORM && user.hp > user.getMaxHp() / 2 ? 15 : 60;
    }
    return score;
  }
  const benefit =
    move.getUserBenefitScore(user, target, move) + move.getTargetBenefitScore(user, target, move) * (opponent ? 1 : -1);
  let score = Number.isFinite(benefit) ? benefit * 6 : -1000;
  if (move.hasAttr("HealAttr") && target === user) {
    const missing = 1 - user.getHpRatio();
    if (missing < 0.2) {
      return -1000;
    }
    const survivesUntilHeal = user.getOpponents().every(p => goesFirst(user, p, move)) || incoming < user.hp;
    return survivesUntilHeal ? 80 + Math.min(missing, 0.5) * 100 - (incoming >= user.getMaxHp() * 0.6 ? 50 : 0) : -500;
  }
  const boosts = move.getAttrs("StatStageChangeAttr").filter(a => a.selfTarget && a.stages > 0);
  if (boosts.length > 0) {
    if (boosts.every(a => a.stats.every(stat => user.getStatStage(stat) >= 6)) || incoming >= user.hp * 0.7) {
      return -500;
    }
    score += 55 * (1 - incoming / Math.max(1, user.hp));
  }
  if ([MoveId.HAZE, MoveId.CLEAR_SMOG, MoveId.ROAR, MoveId.WHIRLWIND].includes(move.id)) {
    const enemyBoosts = Math.max(
      0,
      ...user.getOpponents().map(p => p.getStatStages().reduce((sum, s) => sum + Math.max(0, s), 0)),
    );
    score += enemyBoosts * 35;
    if (!enemyBoosts && move.id === MoveId.HAZE) {
      return -500;
    }
  }
  return score * accuracy;
}

export function chooseTrainerMove(user: EnemyPokemon, pool: PokemonMove[]): TurnMove | null {
  if (!usesTrainerTactics()) {
    return null;
  }
  const incoming = getKnownIncomingDamage(user);
  const choices = pool.map(pokemonMove => {
    const move = allMoves[getWeatherMoveId(user, pokemonMove.getMove())];
    const targetSet = getMoveTargets(user, move.id);
    const targets = targetSet.targets.map(i => globalScene.getField()[i]).filter(p => p?.isActive(true));
    const scores = targets.map(target => ({ target, score: scoreTarget(user, target, move, incoming) }));
    scores.sort((a, b) => b.score - a.score);
    const selected = targetSet.multiple ? scores : scores.slice(0, 1);
    return {
      move: pokemonMove.moveId,
      targets: selected.map(s => s.target.getBattlerIndex()),
      score: selected.length > 0 ? selected.reduce((total, s) => total + s.score, 0) : -10000,
    };
  });
  choices.sort((a, b) => b.score - a.score);
  const chosen = choices[0];
  if (!chosen || chosen.targets.length === 0) {
    return null;
  }
  return { move: chosen.move, targets: chosen.targets, useMode: MoveUseMode.NORMAL };
}

/** Enable the best tactical decisions in PVP without applying NPC stat/item bonuses. */
export function usesTrainerTactics(): boolean {
  return globalScene.gameMode.modeId === GameModes.PVP || !!getTrainerStrength();
}

export function trainerCanFinishOpponent(user: EnemyPokemon): boolean {
  return user
    .getMoveset()
    .filter(m => m.isUsable(user, false, true)[0])
    .some(m => {
      const move = allMoves[getWeatherMoveId(user, m.getMove())];
      return user
        .getOpponents()
        .filter(p => p.isActive(true))
        .some(
          p =>
            (move.accuracy >= 90 || move.accuracy < 0)
            && goesFirst(user, p, move)
            && !globalScene.arena.isMoveTerrainCancelled(user, [p.getBattlerIndex()], move)
            && move.applyConditions(user, p, -1)
            && estimateDamage(user, p, move) >= p.hp,
        );
    });
}

/** Adds real offensive coverage and survivability to the existing type/hazard matchup score. */
export function getTrainerMatchupMultiplier(pokemon: EnemyPokemon, opponent: Pokemon): number {
  const damage = Math.max(
    0,
    ...pokemon
      .getMoveset()
      .map(m => estimateDamage(pokemon, opponent, allMoves[getWeatherMoveId(pokemon, m.getMove())])),
  );
  return (
    Math.max(0.1, Math.min(3, damage / Math.max(1, opponent.hp) + 0.5))
    * Math.max(0.1, 1 - (getKnownIncomingDamage(pokemon) / Math.max(1, pokemon.hp)) * 0.5)
  );
}
