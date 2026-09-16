import { allMoves, modifierTypes } from "#data/data-lists";
import { applyLaborLaw } from "#data/policy-items";
import { AbilityId } from "#enums/ability-id";
import { BattleType } from "#enums/battle-type";
import { HitResult } from "#enums/hit-result";
import { ModifierTier } from "#enums/modifier-tier";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { StatusEffect } from "#enums/status-effect";
import { Pokemon } from "#field/pokemon";
import {
  FiveYearPlanModifier,
  LaborLawModifier,
  PensionInsuranceModifier,
  PeoplePowerModifier,
} from "#modifiers/modifier";
import { modifierPool, trainerModifierPool, wildModifierPool } from "#modifiers/modifier-pools";
import { ModifierData } from "#system/modifier-data";
import { GameManager } from "#test/framework/game-manager";
import { NumberHolder } from "#utils/common";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Player policy items", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;
  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });
  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override
      .battleStyle("single")
      .startingLevel(50)
      .enemyLevel(100)
      .enemySpecies(SpeciesId.BLISSEY)
      .enemyAbility(AbilityId.BALL_FETCH)
      .enemyMoveset(MoveId.SPLASH)
      .ability(AbilityId.BALL_FETCH)
      .moveset([MoveId.TACKLE, MoveId.SPLASH])
      .criticalHits(false);
  });

  it("uses weight 24 in the specified player tiers, and never appears in NPC pools", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    for (const [id, tier] of [
      ["LABOR_LAW", ModifierTier.MASTER],
      ["FIVE_YEAR_PLAN", ModifierTier.MASTER],
      ["PEOPLE_POWER", ModifierTier.MASTER],
      ["PENSION_INSURANCE", ModifierTier.ROGUE],
    ] as const) {
      expect(modifierPool[tier].find(m => m.modifierType.id === id)?.weight).toBe(24);
      for (const pool of [trainerModifierPool, wildModifierPool]) {
        expect(
          Object.values(pool)
            .flat()
            .some(m => m.modifierType.id === id),
        ).toBe(false);
      }
    }
  });

  it.each([
    [99, 1, 900],
    [100, 5, 500],
    [101, 1, 1200],
    [101, 5, 2000],
  ])("applies pension at wave %i with %i stacks", async (wave, stacks, expected) => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    game.scene.currentBattle.waveIndex = wave;
    const item = new PensionInsuranceModifier(modifierTypes.PENSION_INSURANCE(), stacks);
    const amount = new NumberHolder(1000);
    item.apply(amount);
    expect(amount.value).toBe(expected);
    expect(item.getMaxStackCount()).toBe(5);
  });

  it("rolls independently at exactly 2857/10000 and remembers the battle across saves", async () => {
    game.override.battleStyle("double");
    await game.classicMode.startBattle(SpeciesId.MAGIKARP, SpeciesId.MAGIKARP);
    const battle = game.scene.currentBattle;
    battle.battleType = BattleType.TRAINER;
    const [first, second] = battle.enemyParty;
    const firstRoll = vi.spyOn(first, "randBattleSeedInt").mockReturnValue(2856);
    const secondRoll = vi.spyOn(second, "randBattleSeedInt").mockReturnValue(2857);
    const item = new LaborLawModifier(modifierTypes.LABOR_LAW());
    game.scene.addModifier(item);
    applyLaborLaw();
    expect(first.isFainted()).toBe(true);
    expect(second.isFainted()).toBe(false);
    expect(firstRoll).toHaveBeenCalledWith(10000);
    expect(secondRoll).toHaveBeenCalledWith(10000);
    item.type.id = "LABOR_LAW";
    const restored = new ModifierData(item, true).toModifier(LaborLawModifier) as LaborLawModifier;
    expect(restored.lastBattleSeed).toBe(battle.battleSeed);
    game.scene.modifiers = [restored];
    applyLaborLaw();
    expect(secondRoll).toHaveBeenCalledTimes(1);
  });

  it("finishes a trainer battle when the whole NPC party must rest", async () => {
    game.override
      .battleType(BattleType.TRAINER)
      .startingWave(5)
      .startingModifier([{ name: "LABOR_LAW" }]);
    const original = Pokemon.prototype.randBattleSeedInt;
    vi.spyOn(Pokemon.prototype, "randBattleSeedInt").mockImplementation(function (this: Pokemon, range, ...args) {
      return range === 10000 ? 0 : original.call(this, range, ...args);
    });
    await game.classicMode.runToSummon(SpeciesId.MAGIKARP);
    await game.phaseInterceptor.to("TrainerVictoryPhase");
    expect(game.scene.getEnemyParty().every(p => p.isFainted())).toBe(true);
    expect(game).toHaveShownMessage(
      `由于劳动法，对手的${game.scene.getEnemyParty()[0].getNameToRender()}必须休息，无法出战！`,
    );
  });

  it("summons a living reserve when the original lead must rest", async () => {
    game.override
      .battleType(BattleType.TRAINER)
      .startingWave(5)
      .startingModifier([{ name: "LABOR_LAW" }]);
    const original = Pokemon.prototype.randBattleSeedInt;
    let rolls = 0;
    vi.spyOn(Pokemon.prototype, "randBattleSeedInt").mockImplementation(function (this: Pokemon, range, ...args) {
      return range === 10000 ? (rolls++ === 0 ? 0 : 9999) : original.call(this, range, ...args);
    });
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    expect(game.field.getEnemyPokemon().isFainted()).toBe(false);
    expect(game.scene.getEnemyParty().filter(p => p.isFainted())).toHaveLength(1);
  });

  it("does not disable wild Pokemon", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    const roll = vi.spyOn(enemy, "randBattleSeedInt").mockReturnValue(0);
    game.scene.addModifier(new LaborLawModifier(modifierTypes.LABOR_LAW()));
    applyLaborLaw();
    expect(enemy.isFainted()).toBe(false);
    expect(roll).not.toHaveBeenCalled();
  });

  it("restores the whole party on acquisition, but not when loading the item", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP, SpeciesId.MAGIKARP);
    const party = game.scene.getPlayerParty();
    for (const p of party) {
      p.hp = 0;
      p.doSetStatus(StatusEffect.FAINT);
      p.getMoveset()[0]!.ppUsed = 5;
    }
    const item = new PeoplePowerModifier(modifierTypes.PEOPLE_POWER());
    game.scene.addModifier(item);
    for (const p of party) {
      expect(p.isFullHp()).toBe(true);
      expect(p.status).toBeNull();
      expect(p.getMoveset()[0]!.ppUsed).toBe(0);
    }
    party[0].hp = 1;
    game.scene.modifiers = [];
    item.type.id = "PEOPLE_POWER";
    game.scene.addModifier(new ModifierData(item, true).toModifier(PeoplePowerModifier), true);
    expect(party[0].hp).toBe(1);
  });

  it.each([
    HitResult.EFFECTIVE,
    HitResult.INDIRECT,
  ] as const)("shares damage %i once with living reserves", async result => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP, SpeciesId.MAGIKARP, SpeciesId.MAGIKARP);
    game.scene.addModifier(new PeoplePowerModifier(modifierTypes.PEOPLE_POWER()));
    const [active, reserve, fainted] = game.scene.getPlayerParty();
    fainted.hp = 0;
    const hp = [active.hp, reserve.hp];
    expect(active.damageAndUpdate(21, { result })).toBe(21);
    expect(active.hp).toBe(hp[0] - 11);
    expect(reserve.hp).toBe(hp[1] - 10);
    expect(fainted.hp).toBe(0);
  });

  it("faints reserves without treating them as a field battler, and conserves small damage", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP, SpeciesId.MAGIKARP, SpeciesId.MAGIKARP);
    game.scene.addModifier(new PeoplePowerModifier(modifierTypes.PEOPLE_POWER()));
    const [active, first, second] = game.scene.getPlayerParty();
    first.hp = 1;
    second.hp = 1;
    const queue = vi.spyOn(game.scene.phaseManager, "queueFaintPhase");
    const hp = active.hp;
    active.damage(1);
    expect(active.hp).toBe(hp - 1);
    expect(first.hp).toBe(1);
    active.damage(6);
    expect(first.isFainted()).toBe(true);
    expect(second.isFainted()).toBe(true);
    expect(queue).not.toHaveBeenCalled();
  });

  it.each([4, 5, 10])("repeats an entire move only on battle turn %i and costs one PP", async turn => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const player = game.field.getPlayerPokemon();
    const enemy = game.field.getEnemyPokemon();
    game.scene.addModifier(new FiveYearPlanModifier(modifierTypes.FIVE_YEAR_PLAN(), player.id));
    game.scene.currentBattle.turn = turn;
    const damage = vi.spyOn(enemy, "damageAndUpdate");
    game.move.use(MoveId.TACKLE);
    await game.toNextTurn();
    expect(damage).toHaveBeenCalledTimes(turn % 5 === 0 ? 2 : 1);
    expect(player.getMoveset().find(m => m.moveId === MoveId.TACKLE)!.ppUsed).toBe(1);
    if (turn === 4) {
      expect(game).toHaveShownMessage("五年之期已至！" as string);
    }
  });

  it("repeats every hit of a multi-hit move instead of adding a single strike", async () => {
    game.override.moveset([MoveId.DOUBLE_HIT]);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const player = game.field.getPlayerPokemon();
    const enemy = game.field.getEnemyPokemon();
    game.scene.addModifier(new FiveYearPlanModifier(modifierTypes.FIVE_YEAR_PLAN(), player.id));
    game.scene.currentBattle.turn = 5;
    vi.spyOn(allMoves[MoveId.DOUBLE_HIT], "calculateBattleAccuracy").mockReturnValue(-1);
    const damage = vi.spyOn(enemy, "damageAndUpdate");
    game.move.use(MoveId.DOUBLE_HIT);
    await game.toNextTurn();
    expect(damage).toHaveBeenCalledTimes(4);
    expect(player.getMoveset()[0]!.ppUsed).toBe(1);
  });

  it("allows five-year plans to transfer within the party but not to an NPC", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP, SpeciesId.MAGIKARP);
    const [first, second] = game.scene.getPlayerParty();
    const item = new FiveYearPlanModifier(modifierTypes.FIVE_YEAR_PLAN(), first.id);
    game.scene.addModifier(item);
    expect(game.scene.canTransferHeldItemModifier(item, game.field.getEnemyPokemon())).toBe(false);
    expect(game.scene.tryTransferHeldItemModifier(item, game.field.getEnemyPokemon(), false)).toBe(false);
    expect(game.scene.tryTransferHeldItemModifier(item, second, false)).toBe(true);
  });
});
