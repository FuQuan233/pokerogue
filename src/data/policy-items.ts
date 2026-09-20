import { globalScene } from "#app/global-scene";
import { BattleType } from "#enums/battle-type";
import { GameModes } from "#enums/game-modes";
import { MoveId } from "#enums/move-id";
import { MoveUseMode } from "#enums/move-use-mode";
import { StatusEffect } from "#enums/status-effect";
import type { Pokemon } from "#field/pokemon";
import { FiveYearPlanModifier, LaborLawModifier, PeoplePowerModifier } from "#modifiers/modifier";
import { PokemonMove } from "#moves/pokemon-move";

/** Compare intrinsic species/form/fusion stats, without equipment or this item's own effect. */
export function getPeoplePowerBaseStats(pokemon: Pokemon): number[] | undefined {
  if (
    (!pokemon.isPlayer() && globalScene.gameMode.modeId !== GameModes.PVP)
    || !globalScene.findModifier(m => m instanceof PeoplePowerModifier, pokemon.isPlayer())
    || !pokemon.isOnField()
  ) {
    return;
  }
  const party: Pokemon[] = pokemon.isPlayer() ? globalScene.getPlayerParty() : globalScene.getEnemyParty();
  if (!party.includes(pokemon)) {
    return;
  }
  const stats = party.map(p => p.calculateBaseStats(true));
  const totals = stats.map(values => values.reduce((sum, value) => sum + value, 0));
  if (totals[party.indexOf(pokemon)] !== Math.min(...totals)) {
    return;
  }
  return stats[party.indexOf(pokemon)].map((value, index) =>
    Math.max(1, Math.floor((value + Math.max(...stats.map(values => values[index]))) / 2)),
  );
}

/** Runs before NPC sends out its team. No faint abilities, revives or EXP are triggered. */
export function applyLaborLaw(): void {
  const battle = globalScene.currentBattle;
  if (battle.battleType !== BattleType.TRAINER || globalScene.gameMode.modeId === GameModes.PVP) {
    return;
  }
  const item = globalScene.findModifier(m => m instanceof LaborLawModifier) as LaborLawModifier | undefined;
  if (!item || item.lastBattleSeed === battle.battleSeed) {
    return;
  }
  item.lastBattleSeed = battle.battleSeed;
  for (const pokemon of battle.enemyParty) {
    if (pokemon.isFainted() || pokemon.randBattleSeedInt(10000) >= 2857) {
      continue;
    }
    pokemon.hp = 0;
    pokemon.doSetStatus(StatusEffect.FAINT);
    globalScene.phaseManager.queueMessage(`由于劳动法，对手的${pokemon.getNameToRender()}必须休息，无法出战！`);
  }
}

export function hasFiveYearPlan(pokemon: Pokemon): boolean {
  return (
    (pokemon.isPlayer() || globalScene.gameMode.modeId === GameModes.PVP)
    && !!globalScene.findModifier(
      m => m instanceof FiveYearPlanModifier && m.pokemonId === pokemon.id,
      pokemon.isPlayer(),
    )
  );
}

export function isFiveYearPlanTurn(): boolean {
  return globalScene.currentBattle.turn > 0 && globalScene.currentBattle.turn % 5 === 0;
}

const repeatedTurns = new WeakMap<Pokemon, { seed: string; turn: number }>();

export function repeatFiveYearPlanMove(pokemon: Pokemon, moveId: MoveId, targets: Pokemon[]): void {
  if (moveId === MoveId.NONE || !pokemon.isActive(true) || !isFiveYearPlanTurn() || !hasFiveYearPlan(pokemon)) {
    return;
  }
  const { battleSeed: seed, turn } = globalScene.currentBattle;
  const previous = repeatedTurns.get(pokemon);
  if (previous?.seed === seed && previous.turn === turn) {
    return;
  }
  repeatedTurns.set(pokemon, { seed, turn });
  let liveTargets = targets.filter(p => p.isActive(true));
  if (liveTargets.length === 0 && targets.some(p => p.isPlayer() !== pokemon.isPlayer())) {
    liveTargets = pokemon
      .getOpponents()
      .filter(p => p.isActive(true))
      .slice(0, 1);
  }
  if (liveTargets.length === 0) {
    return;
  }
  globalScene.phaseManager.unshiftNew(
    "MovePhase",
    pokemon,
    liveTargets.map(p => p.getBattlerIndex()),
    new PokemonMove(moveId),
    MoveUseMode.FOLLOW_UP,
  );
}
