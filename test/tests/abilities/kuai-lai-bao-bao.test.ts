import { AbilityId } from "#enums/ability-id";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { PokemonData } from "#system/pokemon-data";
import { GameManager } from "#test/framework/game-manager";
import { toDmgValue } from "#utils/common";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Abilities - Kuai Lai Bao Bao", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;
  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });
  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override
      .battleStyle("single")
      .criticalHits(false)
      .ability(AbilityId.KUAI_LAI_BAO_BAO)
      .enemySpecies(SpeciesId.BLISSEY)
      .enemyAbility(AbilityId.BALL_FETCH)
      .enemyMoveset(MoveId.SPLASH)
      .startingLevel(100)
      .enemyLevel(1000)
      .moveset(MoveId.TACKLE);
  });

  it.each([
    1, 2, 3, 4, 5, 6, 7,
  ])("makes %i strikes based on remaining bars; every extra strike is half damage", async bars => {
    await game.classicMode.startBattle(SpeciesId.BAOLILONG);
    const user = game.field.getPlayerPokemon();
    const target = game.field.getEnemyPokemon();
    user.hp = Math.round((user.getMaxHp() * (bars - 1)) / 7) + 1;
    const damage = vi.spyOn(target, "damage");
    game.move.select(MoveId.TACKLE);
    await game.phaseInterceptor.to("TurnEndPhase", false);
    expect(user.turnData.hitCount).toBe(bars);
    expect(damage).toHaveBeenCalledTimes(bars);
    const first = damage.mock.calls[0][0];
    for (const call of damage.mock.calls.slice(1)) {
      expect(call[0]).toBe(toDmgValue(first * 0.5));
    }
  });

  it("halves fixed-damage extra strikes as well", async () => {
    game.override.moveset(MoveId.SEISMIC_TOSS);
    await game.classicMode.startBattle(SpeciesId.BAOLILONG);
    const target = game.field.getEnemyPokemon();
    const damage = vi.spyOn(target, "damage");
    game.move.select(MoveId.SEISMIC_TOSS);
    await game.phaseInterceptor.to("TurnEndPhase", false);
    expect(damage.mock.calls.map(call => call[0])).toEqual([100, 50, 50, 50, 50, 50, 50]);
  });

  it.each([MoveId.SPLASH, MoveId.DOUBLE_HIT])("keeps Parental Bond exclusions for move %i", async move => {
    game.override.moveset(move).enemyAbility(AbilityId.NO_GUARD);
    await game.classicMode.startBattle(SpeciesId.BAOLILONG);
    game.move.select(move);
    await game.phaseInterceptor.to("TurnEndPhase", false);
    expect(game.field.getPlayerPokemon().turnData.hitCount).toBe(move === MoveId.DOUBLE_HIT ? 2 : 1);
  });

  it.each([
    false,
    true,
  ])("uses boss overflow rules on either side (enemy=%s), with no double shield processing", async enemy => {
    game.override.enemyAbility(AbilityId.KUAI_LAI_BAO_BAO);
    await game.classicMode.runToSummon(SpeciesId.BAOLILONG);
    const user = enemy ? game.field.getEnemyPokemon() : game.field.getPlayerPokemon();
    vi.spyOn(user, "getMaxHp").mockReturnValue(700);
    if (enemy) {
      game.field.getEnemyPokemon().setBoss(true, 3);
    }
    user.hp = 700;
    expect(user.damage(150, false, true, true)).toBe(100);
    expect(user.hp).toBe(600);
    expect(user.getBaoBaoHealthSegments()).toBe(6);
    user.hp = 700;
    expect(user.damage(500, false, true, true)).toBe(300);
    expect(user.hp).toBe(400);
    expect(user.getBaoBaoHealthSegments()).toBe(4);
    user.hp = 100;
    expect(user.damage(100, false, true, true)).toBe(100);
    expect(user.hp).toBe(0);
  });

  it("counts rounded boundaries, healing, and restored HP without stale segment state", async () => {
    await game.classicMode.runToSummon(SpeciesId.BAOLILONG);
    const user = game.field.getPlayerPokemon();
    const threshold = Math.round((user.getMaxHp() * 3) / 7);
    user.hp = threshold;
    expect(user.getBaoBaoHealthSegments()).toBe(3);
    user.hp += 1;
    expect(user.getBaoBaoHealthSegments()).toBe(4);
    const restored = new PokemonData(JSON.parse(JSON.stringify(new PokemonData(user)))).toPokemon();
    expect(restored.getBaoBaoHealthSegments()).toBe(4);
    user.heal(user.getMaxHp());
    expect(user.getBaoBaoHealthSegments()).toBe(7);
  });

  it("respects explicit shield bypass and ability suppression", async () => {
    await game.classicMode.runToSummon(SpeciesId.BAOLILONG);
    const user = game.field.getPlayerPokemon();
    vi.spyOn(user, "getMaxHp").mockReturnValue(700);
    user.hp = 700;
    expect(user.damage(150, true)).toBe(150);
    user.hp = 700;
    user.suppressAbility();
    expect(user.damage(150)).toBe(150);
  });

  it("shows six HP dividers and removes them when the ability is suppressed", async () => {
    await game.classicMode.startBattle(SpeciesId.BAOLILONG);
    const user = game.field.getPlayerPokemon();
    // The framework's MockRectangle.setName is a no-op, so inspect actual drawing calls.
    const rectangles = vi.spyOn(game.scene.add, "rectangle");
    await user.updateInfo(true);
    expect(rectangles).toHaveBeenCalledTimes(6);
    const destroyed = rectangles.mock.results.map(result => vi.spyOn(result.value, "destroy"));
    rectangles.mockClear();
    user.suppressAbility();
    await user.updateInfo(true);
    expect(rectangles).not.toHaveBeenCalled();
    for (const destroy of destroyed) {
      expect(destroy).toHaveBeenCalledOnce();
    }
  });

  it.each([MoveId.FLAMETHROWER, MoveId.ICE_BEAM])("matches Thick Fat damage for move %i", async move => {
    game.override.moveset(MoveId.SPLASH).enemyMoveset(move).enemyLevel(100).enemySpecies(SpeciesId.MEW);
    await game.classicMode.startBattle(SpeciesId.BAOLILONG);
    const user = game.field.getPlayerPokemon();
    const enemy = game.field.getEnemyPokemon();
    // Compare the actual move calculation under each ability with the same RNG seed.
    const { allMoves } = await import("#data/data-lists");

    game.scene.resetSeed();
    const custom = user.getAttackDamage({ source: enemy, move: allMoves[move] });
    game.override.ability(AbilityId.THICK_FAT);
    game.scene.resetSeed();
    const thickFat = user.getAttackDamage({ source: enemy, move: allMoves[move] });
    expect(custom.damage).toBe(thickFat.damage);
  });
});
