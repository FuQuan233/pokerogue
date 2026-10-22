import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { allAbilities } from "#data/data-lists";
import { CustomPokemonData } from "#data/pokemon-data";
import { AbilityId } from "#enums/ability-id";
import { BattlerTagType } from "#enums/battler-tag-type";
import { MoveId } from "#enums/move-id";
import { MoveResult } from "#enums/move-result";
import { SpeciesId } from "#enums/species-id";
import { PokemonData } from "#system/pokemon-data";
import { GameManager } from "#test/framework/game-manager";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("Abilities - Fa Bao Shi Ling", () => {
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
      .moveset(MoveId.SPLASH)
      .enemySpecies(SpeciesId.MAGIKARP)
      .enemyAbility(AbilityId.BALL_FETCH)
      .enemyMoveset(MoveId.SPLASH);
  });

  it("affects the ally and both enemies, but excludes itself and benched Pokemon", async () => {
    game.override.battleStyle("double");
    await game.classicMode.startBattle(SpeciesId.TUBAOQIU, SpeciesId.MAGIKARP, SpeciesId.BULBASAUR);
    const [source, ally, reserve] = game.scene.getPlayerParty();
    expect(source.getAbility().id).toBe(AbilityId.FA_BAO_SHI_LING);
    for (const target of [ally, ...game.scene.getEnemyField()]) {
      expect(target.getAbility().id).toBe(AbilityId.TRUANT);
      expect(target.getTag(BattlerTagType.TRUANT)).toBeDefined();
    }
    expect(reserve.getAbility().id).not.toBe(AbilityId.TRUANT);
    expect(reserve.summonData.ability).toBeUndefined();
  });

  it("causes the affected opponent to loaf every other turn", async () => {
    await game.classicMode.startBattle(SpeciesId.TUBAOQIU);
    const enemy = game.field.getEnemyPokemon();
    game.move.select(MoveId.SPLASH);
    await game.toNextTurn();
    expect(enemy.getLastXMoves(1)[0]).toEqual(
      expect.objectContaining({ move: MoveId.SPLASH, result: MoveResult.SUCCESS }),
    );
    game.move.select(MoveId.SPLASH);
    await game.toNextTurn();
    expect(enemy.getLastXMoves(1)[0]).toEqual(expect.objectContaining({ move: MoveId.NONE, result: MoveResult.FAIL }));
    game.move.select(MoveId.SPLASH);
    await game.toNextTurn();
    expect(enemy.getLastXMoves(1)[0]).toEqual(
      expect.objectContaining({ move: MoveId.SPLASH, result: MoveResult.SUCCESS }),
    );
  });

  it("restores a target on switching out and does not automatically affect later switch-ins", async () => {
    game.override
      .enemySpecies(SpeciesId.TUBAOQIU)
      .enemyAbility(AbilityId.FA_BAO_SHI_LING)
      .ability(AbilityId.BALL_FETCH);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP, SpeciesId.FEEBAS);
    const original = game.field.getPlayerPokemon();
    expect(original.getAbility().id).toBe(AbilityId.TRUANT);
    game.doSwitchPokemon(1);
    await game.toNextTurn();
    expect(original.getAbility().id).toBe(AbilityId.BALL_FETCH);
    expect(original.summonData.ability).toBeUndefined();
    expect(original.getTag(BattlerTagType.TRUANT)).toBeUndefined();
    expect(game.field.getPlayerPokemon().getAbility().id).toBe(AbilityId.BALL_FETCH);
    game.doSwitchPokemon(1);
    await game.toNextTurn();
    expect(game.field.getPlayerPokemon()).toBe(original);
    expect(original.getAbility().id).toBe(AbilityId.BALL_FETCH);
  });

  it("retains the imposed ability after its source switches out", async () => {
    await game.classicMode.startBattle(SpeciesId.TUBAOQIU, SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    game.doSwitchPokemon(1);
    await game.toNextTurn();
    expect(enemy.getAbility().id).toBe(AbilityId.TRUANT);
  });

  it("can apply the effect again when its source re-enters", async () => {
    await game.classicMode.startBattle(SpeciesId.TUBAOQIU, SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    game.doSwitchPokemon(1);
    await game.toNextTurn();
    enemy.setTempAbility(allAbilities[AbilityId.BALL_FETCH]);
    game.doSwitchPokemon(1);
    await game.toNextTurn();
    expect(game.field.getPlayerPokemon().species.speciesId).toBe(SpeciesId.TUBAOQIU);
    expect(enemy.getAbility().id).toBe(AbilityId.TRUANT);
  });

  it("preserves the other three fusion slots and permanent custom abilities, including after reload", async () => {
    game.override.enemySpecies(SpeciesId.TUBAOQIU).enemyAbility(AbilityId.FA_BAO_SHI_LING).hasPassiveAbility(true);
    await game.classicMode.runToSummon(SpeciesId.MAGIKARP, SpeciesId.FEEBAS);
    const [pokemon, partner] = game.scene.getPlayerParty();
    pokemon.fuse(partner);
    pokemon.customPokemonData.ability = AbilityId.BALL_FETCH;
    pokemon.customPokemonData.passive = AbilityId.SAP_SIPPER;
    pokemon.fusionCustomPokemonData = new CustomPokemonData();
    pokemon.fusionCustomPokemonData.ability = AbilityId.THICK_FAT;
    pokemon.fusionCustomPokemonData.passive = AbilityId.WATER_ABSORB;
    await game.phaseInterceptor.to("CommandPhase", false);
    const expected = [AbilityId.TRUANT, AbilityId.SAP_SIPPER, AbilityId.THICK_FAT, AbilityId.WATER_ABSORB];
    expect(pokemon.getEffectiveAbilityEntries().map(entry => entry.ability.id)).toEqual(expected);
    expect(pokemon.hasAbility(AbilityId.THICK_FAT)).toBe(true);
    expect(pokemon.customPokemonData.ability).toBe(AbilityId.BALL_FETCH);
    const restored = new PokemonData(JSON.parse(JSON.stringify(new PokemonData(pokemon)))).toPokemon();
    expect(restored.getEffectiveAbilityEntries().map(entry => entry.ability.id)).toEqual(expected);
    restored.resetSummonData();
    expect(restored.getEffectiveAbilityEntries().map(entry => entry.ability.id)).toEqual([
      AbilityId.BALL_FETCH,
      AbilityId.SAP_SIPPER,
      AbilityId.THICK_FAT,
      AbilityId.WATER_ABSORB,
    ]);
  });

  it("preserves existing whole-main-ability replacement when a later effect replaces Truant", async () => {
    game.override.enemySpecies(SpeciesId.TUBAOQIU).enemyAbility(AbilityId.FA_BAO_SHI_LING);
    await game.classicMode.runToSummon(SpeciesId.MAGIKARP, SpeciesId.FEEBAS);
    const [pokemon, partner] = game.scene.getPlayerParty();
    pokemon.fuse(partner);
    await game.phaseInterceptor.to("CommandPhase", false);
    expect(pokemon.summonData.abilityFirstSlotOnly).toBe(true);
    pokemon.setTempAbility(allAbilities[AbilityId.BALL_FETCH]);
    expect(pokemon.summonData.abilityFirstSlotOnly).toBe(false);
    expect(
      pokemon
        .getEffectiveAbilityEntries()
        .filter(entry => !entry.passive)
        .map(entry => entry.ability.id),
    ).toEqual([AbilityId.BALL_FETCH]);
  });

  it("does not affect targets when its source's ability is suppressed", async () => {
    game.override.enemyAbility(AbilityId.NEUTRALIZING_GAS);
    await game.classicMode.startBattle(SpeciesId.TUBAOQIU);
    expect(game.field.getEnemyPokemon().getAbility().id).toBe(AbilityId.NEUTRALIZING_GAS);
    expect(game.field.getEnemyPokemon().summonData.ability).toBeUndefined();
  });

  it("does not mutate a target when evaluating a simulated entry", async () => {
    await game.classicMode.startBattle(SpeciesId.TUBAOQIU);
    const enemy = game.field.getEnemyPokemon();
    enemy.setTempAbility(allAbilities[AbilityId.BALL_FETCH]);
    applyAbAttrs("PostSummonGiveOthersAbilityAbAttr", { pokemon: game.field.getPlayerPokemon(), simulated: true });
    expect(enemy.getAbility().id).toBe(AbilityId.BALL_FETCH);
  });
});
