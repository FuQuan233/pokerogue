import { AbilityId } from "#enums/ability-id";
import { BattlerIndex } from "#enums/battler-index";
import { HitResult } from "#enums/hit-result";
import { MoveId } from "#enums/move-id";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesId } from "#enums/species-id";
import { ComboScrollModifier, FirecrackerModifier } from "#modifiers/modifier";
import { GameManager } from "#test/framework/game-manager";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Firecracker and fusion damage regressions", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;

  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });

  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override
      .battleStyle("single")
      .ability(AbilityId.BALL_FETCH)
      .moveset(MoveId.TACKLE)
      .startingLevel(100)
      .enemySpecies(SpeciesId.BLISSEY)
      .enemyLevel(1000)
      .enemyAbility(AbilityId.BALL_FETCH)
      .enemyMoveset(MoveId.SPLASH)
      .criticalHits(false);
  });

  it("keeps Flying immunity to Dugtrio's Earthquake in a four-type fusion", async () => {
    game.override
      .ability(AbilityId.NONE)
      .moveset(MoveId.SPLASH)
      .enemySpecies(SpeciesId.DUGTRIO)
      .enemyMoveset(MoveId.EARTHQUAKE);
    await game.classicMode.startBattle(SpeciesId.VESPIQUEN, SpeciesId.BAOLILONG);
    const [player, partner] = game.scene.getPlayerParty();
    player.fuse(partner);
    player.hp = player.getMaxHp();
    expect(player.hasAbility(AbilityId.KUAI_LAI_BAO_BAO)).toBe(true);
    expect(new Set(player.getTypes())).toEqual(
      new Set([PokemonType.BUG, PokemonType.FLYING, PokemonType.ICE, PokemonType.WATER]),
    );
    expect(player.getAttackTypeEffectiveness(PokemonType.GROUND)).toBe(0);
    const hp = player.hp;
    game.move.select(MoveId.SPLASH);
    await game.toNextTurn();
    expect(player.hp).toBe(hp);
  });

  it("does not reduce triggered Firecracker damage on Multi Lens strikes", async () => {
    game.override.startingHeldItems([{ name: "FIRECRACKER" }, { name: "MULTI_LENS" }]);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    enemy.setBoss(false);
    const damage = vi.spyOn(enemy, "damageAndUpdate");
    vi.spyOn(FirecrackerModifier.prototype, "apply").mockImplementation((_pokemon, holder) => {
      holder.value = 2026;
      return true;
    });
    game.move.select(MoveId.TACKLE);
    game.setTurnOrder([BattlerIndex.PLAYER, BattlerIndex.ENEMY]);
    await game.phaseInterceptor.to("MoveEndPhase", false);
    expect(damage.mock.calls.map(call => call[0])).toEqual([2026, 2026]);
  });

  it("checks Firecracker independently for Combo Scroll's extra damage", async () => {
    game.override.startingHeldItems([{ name: "FIRECRACKER" }, { name: "COMBO_SCROLL" }]);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    enemy.setBoss(false);
    const damage = vi.spyOn(enemy, "damageAndUpdate");
    const firecracker = vi.spyOn(FirecrackerModifier.prototype, "apply").mockImplementation((_pokemon, holder) => {
      holder.value = 2026;
      return true;
    });
    vi.spyOn(ComboScrollModifier.prototype, "apply").mockImplementation((_pokemon, triggered, multiplier) => {
      triggered.value = true;
      multiplier.value = 0.7;
      return true;
    });
    game.move.select(MoveId.TACKLE);
    game.setTurnOrder([BattlerIndex.PLAYER, BattlerIndex.ENEMY]);
    await game.phaseInterceptor.to("MoveEndPhase", false);
    expect(firecracker).toHaveBeenCalledTimes(2);
    expect(damage.mock.calls.map(call => call[0])).toEqual([2026, 2026]);
  });

  it("does not announce a proc when ordinary damage equals 2026", async () => {
    game.override.startingHeldItems([{ name: "FIRECRACKER" }]);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    enemy.setBoss(false);
    vi.spyOn(enemy, "getAttackDamage").mockReturnValue({
      damage: 2026,
      result: HitResult.EFFECTIVE,
      cancelled: false,
    });
    vi.spyOn(game.field.getPlayerPokemon(), "randBattleSeedInt").mockReturnValue(9999);
    const message = vi.spyOn(game.scene.phaseManager, "queueMessage");
    game.move.select(MoveId.TACKLE);
    game.setTurnOrder([BattlerIndex.PLAYER, BattlerIndex.ENEMY]);
    await game.phaseInterceptor.to("MoveEndPhase", false);
    expect(message.mock.calls.some(call => call[0].includes("爆竹发动"))).toBe(false);
  });

  it("still respects boss segments when 2026 exceeds remaining HP", async () => {
    game.override.enemyLevel(100).startingHeldItems([{ name: "FIRECRACKER" }]);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    enemy.setBoss(true, 7);
    enemy.hp = enemy.getMaxHp();
    expect(enemy.hp).toBeLessThan(2026);
    vi.spyOn(FirecrackerModifier.prototype, "apply").mockImplementation((_pokemon, holder) => {
      holder.value = 2026;
      return true;
    });
    game.move.select(MoveId.TACKLE);
    game.setTurnOrder([BattlerIndex.PLAYER, BattlerIndex.ENEMY]);
    await game.phaseInterceptor.to("MoveEndPhase", false);
    expect(enemy.hp).toBeGreaterThan(0);
    expect(enemy.hp).toBeLessThan(enemy.getMaxHp());
  });
});
