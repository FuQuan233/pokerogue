import { AbilityId } from "#enums/ability-id";
import { BattleType } from "#enums/battle-type";
import { BattlerIndex } from "#enums/battler-index";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { TrainerSlot } from "#enums/trainer-slot";
import { TrainerType } from "#enums/trainer-type";
import { TrainerVariant } from "#enums/trainer-variant";
import { Pokemon } from "#field/pokemon";
import { Trainer } from "#field/trainer";
import { GameManager } from "#test/framework/game-manager";
import { classicFixedBattles } from "#trainers/fixed-battle-configs";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Enemy replacement after double knockout", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;

  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });

  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override
      .battleType(BattleType.TRAINER)
      .battleStyle("double")
      .startingWave(112)
      .startingLevel(200)
      .enemyLevel(20)
      .enemySpecies(SpeciesId.MAGIKARP)
      .enemyAbility(AbilityId.BALL_FETCH)
      .enemyMoveset(MoveId.SPLASH)
      .enemyHeldItems([])
      .ability(AbilityId.BALL_FETCH)
      .moveset([MoveId.DAZZLING_GLEAM, MoveId.SPLASH]);
  });

  it.each([
    [TrainerVariant.DEFAULT, 2],
    [TrainerVariant.DEFAULT, 3],
    [TrainerVariant.DOUBLE, 2],
    [TrainerVariant.DOUBLE, 3],
  ])("summons the last reserve (variant %i, party slot %i)", async (trainerVariant, reserveIndex) => {
    vi.spyOn(classicFixedBattles[112], "getTrainer").mockImplementation(
      () => new Trainer(TrainerType.ROCKET_GRUNT, trainerVariant),
    );
    await game.classicMode.startBattle(SpeciesId.MEW, SpeciesId.MEW);
    const party = game.scene.getEnemyParty();
    const reserve = party[reserveIndex];
    expect(reserve).toBeDefined();
    for (const pokemon of party.slice(2)) {
      if (pokemon !== reserve) {
        pokemon.hp = 0;
      }
    }
    game.move.select(MoveId.DAZZLING_GLEAM);
    game.move.select(MoveId.SPLASH, 1);
    game.setTurnOrder([BattlerIndex.PLAYER, BattlerIndex.PLAYER_2, BattlerIndex.ENEMY, BattlerIndex.ENEMY_2]);
    await game.toNextTurn();
    expect(reserve.isActive(true)).toBe(true);
    expect(game.scene.getEnemyField().filter(p => p.isActive(true))).toEqual([reserve]);
  });

  it.each([
    [0, 1, 2],
    [0, 1, 3],
    [0, 1, 4],
    [0, 1, 5],
    [0, 2, 3],
    [0, 2, 4],
    [0, 2, 5],
    [0, 3, 4],
    [0, 3, 5],
    [0, 4, 5],
    [1, 2, 3],
    [1, 2, 4],
    [1, 2, 5],
    [1, 3, 4],
    [1, 3, 5],
    [1, 4, 5],
    [2, 3, 4],
    [2, 3, 5],
    [2, 4, 5],
    [3, 4, 5],
  ])("summons the grunt reserve after Labor Law rests slots %i, %i, %i", async (...restingSlots) => {
    game.override.startingWave(112).startingModifier([{ name: "LABOR_LAW" }]);
    vi.spyOn(classicFixedBattles[112], "getTrainer").mockImplementation(
      () => new Trainer(TrainerType.ROCKET_GRUNT, TrainerVariant.DOUBLE),
    );
    const original = Pokemon.prototype.randBattleSeedInt;
    let rolls = 0;
    vi.spyOn(Pokemon.prototype, "randBattleSeedInt").mockImplementation(function (this: Pokemon, range, ...args) {
      return range === 10000 ? (restingSlots.includes(rolls++) ? 0 : 9999) : original.call(this, range, ...args);
    });
    await game.classicMode.startBattle(SpeciesId.MEW, SpeciesId.MEW);
    const party = game.scene.getEnemyParty();
    expect(party.filter(p => p.isFainted())).toHaveLength(3);
    expect(game.scene.currentBattle.trainer?.isDouble(), "The regression requires two opposing trainers").toBe(true);
    for (let turn = 0; turn < 3; turn++) {
      const living = party.filter(p => !p.isFainted());
      const active = game.scene.getEnemyField().filter(p => p.isActive(true));
      expect(active.length).toBeGreaterThan(0);
      for (const pokemon of active) {
        expect(pokemon.trainerSlot).toBe(
          pokemon.getFieldIndex() === 0 ? TrainerSlot.TRAINER : TrainerSlot.TRAINER_PARTNER,
        );
      }
      game.move.select(MoveId.DAZZLING_GLEAM);
      game.move.select(MoveId.SPLASH, 1);
      game.setTurnOrder([BattlerIndex.PLAYER, BattlerIndex.PLAYER_2, ...active.map(p => p.getBattlerIndex())]);
      if (living.length === active.length) {
        await game.phaseInterceptor.to("TrainerVictoryPhase");
        expect(party.every(p => p.isFainted())).toBe(true);
        return;
      }
      await game.toNextTurn();
    }
    expect.fail("The remaining grunt Pokemon should all have entered battle and been defeated");
  });
});
