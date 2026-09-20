import { modifierTypes } from "#data/data-lists";
import { canCaptureTrainerPokemon } from "#data/trainer-capture";
import { AbilityId } from "#enums/ability-id";
import { BattleType } from "#enums/battle-type";
import { ModifierTier } from "#enums/modifier-tier";
import { MoveId } from "#enums/move-id";
import { PokeballType } from "#enums/pokeball";
import { SpeciesId } from "#enums/species-id";
import { StatusEffect } from "#enums/status-effect";
import { SwitchType } from "#enums/switch-type";
import { TrainerType } from "#enums/trainer-type";
import { type PokemonHeldItemModifier, RocketTeamBadgeModifier } from "#modifiers/modifier";
import { modifierPool, trainerModifierPool, wildModifierPool } from "#modifiers/modifier-pools";
import { AttemptCapturePhase } from "#phases/attempt-capture-phase";
import type { CommandPhase } from "#phases/command-phase";
import { SwitchSummonPhase } from "#phases/switch-summon-phase";
import { ModifierData } from "#system/modifier-data";
import { GameManager } from "#test/framework/game-manager";
import { trainerConfigs } from "#trainers/trainer-config";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Rocket Team Badge", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;
  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });
  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override
      .battleType(BattleType.TRAINER)
      .randomTrainer({ trainerType: TrainerType.ACE_TRAINER })
      .startingWave(21)
      .battleStyle("single")
      .startingLevel(100)
      .enemyLevel(50)
      .enemySpecies(SpeciesId.MAGIKARP)
      .enemyAbility(AbilityId.BALL_FETCH)
      .ability(AbilityId.BALL_FETCH)
      .moveset(MoveId.SPLASH)
      .enemyMoveset(MoveId.SPLASH)
      .enemyHeldItems([])
      .startingModifier([{ name: "ROCKET_TEAM_BADGE" }]);
  });

  it("is a persistent, one-stack player-only Master tier item with weight 24", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const item = game.scene.findModifier(m => m instanceof RocketTeamBadgeModifier)!;
    const restored = new ModifierData(item, true).toModifier(RocketTeamBadgeModifier)!;
    expect(restored).toBeInstanceOf(RocketTeamBadgeModifier);
    expect(restored.getMaxStackCount()).toBe(1);
    expect(restored.clone().match(item)).toBe(true);
    expect(modifierPool[ModifierTier.MASTER].find(m => m.modifierType.id === "ROCKET_TEAM_BADGE")?.weight).toBe(24);
    for (const pool of [trainerModifierPool, wildModifierPool]) {
      expect(
        Object.values(pool)
          .flat()
          .some(m => m.modifierType.id === "ROCKET_TEAM_BADGE"),
      ).toBe(false);
    }
  });

  it("blocks trainers without the badge, including direct capture phases without consuming a ball", async () => {
    game.override.startingModifier([]);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    expect(canCaptureTrainerPokemon()).toBe(false);
    const command = game.scene.phaseManager.getCurrentPhase() as CommandPhase;
    expect(command["checkCanUseBall"]()).toBe(false);
    game.scene.pokeballCounts[PokeballType.MASTER_BALL] = 1;
    const phase = new AttemptCapturePhase(0, PokeballType.MASTER_BALL);
    vi.spyOn(phase, "end").mockImplementation(() => {});
    phase.start();
    expect(phase.end).toHaveBeenCalled();
    expect(game.scene.pokeballCounts[PokeballType.MASTER_BALL]).toBe(1);
  });

  it.each([
    TrainerType.RIVAL,
    TrainerType.RIVAL_2,
    TrainerType.RIVAL_3,
    TrainerType.RIVAL_4,
    TrainerType.RIVAL_5,
    TrainerType.RIVAL_6,
  ])("excludes rival stage %i even with the badge", async trainerType => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    vi.spyOn(game.scene.currentBattle.trainer!.config, "getDerivedType").mockReturnValue(
      trainerConfigs[trainerType].getDerivedType(),
    );
    expect(canCaptureTrainerPokemon()).toBe(false);
    const command = game.scene.phaseManager.getCurrentPhase() as CommandPhase;
    expect(command["checkCanUseBall"]()).toBe(false);
  });

  it("preserves the two-active-target restriction", async () => {
    game.override.battleStyle("double");
    await game.classicMode.startBattle(SpeciesId.MAGIKARP, SpeciesId.MAGIKARP);
    expect(canCaptureTrainerPokemon()).toBe(true);
    const command = game.scene.phaseManager.getCurrentPhase() as CommandPhase;
    expect(command["handleBallCommand"](PokeballType.MASTER_BALL)).toBe(false);
  });

  it("preserves boss segment restrictions and the existing Master Ball exception", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    vi.spyOn(enemy, "isBoss").mockReturnValue(true);
    enemy.bossSegmentIndex = 1;
    const command = game.scene.phaseManager.getCurrentPhase() as CommandPhase;
    expect(command["handleBallCommand"](PokeballType.POKEBALL)).toBe(false);
    expect(command["handleBallCommand"](PokeballType.MASTER_BALL)).toBe(true);
  });

  it("catches a trainer Pokemon, transfers only its items and summons a reserve", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    const reserve = game.scene.getEnemyParty().find(p => !p.isOnField())!;
    expect(reserve).toBeDefined();
    const capturedItem = modifierTypes.LEFTOVERS().newModifier(enemy) as PokemonHeldItemModifier;
    const reserveItem = modifierTypes.SHELL_BELL().newModifier(reserve) as PokemonHeldItemModifier;
    await game.scene.addEnemyModifier(capturedItem);
    await game.scene.addEnemyModifier(reserveItem);
    game.scene.pokeballCounts[PokeballType.MASTER_BALL] = 1;
    game.doThrowPokeball(PokeballType.MASTER_BALL);
    await game.phaseInterceptor.to("SwitchSummonPhase");
    expect(game.scene.getPlayerParty()).toHaveLength(2);
    expect(enemy.isFainted()).toBe(true);
    expect(game.scene.modifiers).toContain(capturedItem);
    expect(game.scene.modifiers).not.toContain(reserveItem);
    expect(game.scene.findModifiers(() => true, false)).toContain(reserveItem);
    expect(game.scene.findModifiers(() => true, false)).not.toContain(capturedItem);
    await game.phaseInterceptor.to("CommandPhase");
    expect(game.field.getEnemyPokemon().id).not.toBe(enemy.id);
    expect(game.field.getEnemyPokemon().isActive(true)).toBe(true);
  });

  it("awards trainer victory when the final opponent is caught", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    for (const pokemon of game.scene.getEnemyParty().filter(p => !p.isOnField())) {
      pokemon.hp = 0;
      pokemon.doSetStatus(StatusEffect.FAINT);
    }
    game.scene.pokeballCounts[PokeballType.MASTER_BALL] = 1;
    game.doThrowPokeball(PokeballType.MASTER_BALL);
    await game.phaseInterceptor.to("TrainerVictoryPhase");
    expect(game.scene.getPlayerParty()).toHaveLength(2);
    expect(game.scene.getEnemyParty().every(p => p.isFainted())).toBe(true);
  });

  it("continues after a duplicate replacement queued behind a trainer capture", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    game.scene.pokeballCounts[PokeballType.MASTER_BALL] = 1;
    game.doThrowPokeball(PokeballType.MASTER_BALL);
    await game.phaseInterceptor.to("SwitchSummonPhase");
    game.scene.phaseManager.pushNew("SwitchSummonPhase", SwitchType.SWITCH, 0, -1, false, false);
    await game.phaseInterceptor.to("CommandPhase");
    const replacement = game.field.getEnemyPokemon();
    expect(replacement).not.toBe(enemy);
    expect(replacement.isActive(true)).toBe(true);
    game.move.select(MoveId.SPLASH);
    await game.toNextTurn();
    expect(game.field.getEnemyPokemon()).toBe(replacement);
  });

  it.each([
    "start",
    "switchAndSummon",
  ] as const)("skips an invalid target at %s without resetting the active Pokemon", async method => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    const reset = vi.spyOn(enemy, "resetSummonData");
    const leave = vi.spyOn(enemy, "leaveField");
    const shift = vi.spyOn(game.scene.phaseManager, "shiftPhase").mockImplementation(() => {});
    const postSummon = vi.spyOn(game.scene.phaseManager, "unshiftNew");
    const phase = new SwitchSummonPhase(SwitchType.SWITCH, 0, 999, true, false);
    expect(() => phase[method]()).not.toThrow();
    expect(shift).toHaveBeenCalledOnce();
    expect(reset).not.toHaveBeenCalled();
    expect(leave).not.toHaveBeenCalled();
    expect(postSummon).not.toHaveBeenCalled();
    expect(enemy.isActive(true)).toBe(true);
  });

  it("keeps the trainer Pokemon in battle after a failed catch", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    // Headless tweens skip shake checks. Explicitly exercise the real failure branch instead.
    vi.spyOn(AttemptCapturePhase.prototype, "catch").mockImplementation(function (this: AttemptCapturePhase) {
      this.failCatch(0);
    });
    game.scene.pokeballCounts[PokeballType.POKEBALL] = 1;
    game.doThrowPokeball(PokeballType.POKEBALL);
    await game.toEndOfTurn();
    expect(game.scene.getPlayerParty()).toHaveLength(1);
    expect(game.field.getEnemyPokemon()).toBe(enemy);
    expect(enemy.isActive(true)).toBe(true);
    expect(enemy.visible).toBe(true);
  });
});
