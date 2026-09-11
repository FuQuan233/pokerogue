import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { speciesDataRegistry } from "#app/global-species-data-registry";
import { allMoves, modifierTypes } from "#data/data-lists";
import { CustomPokemonData } from "#data/pokemon-data";
import { AbilityId } from "#enums/ability-id";
import { MoveId } from "#enums/move-id";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesId } from "#enums/species-id";
import { Stat } from "#enums/stat";
import { QuickStrikeScrollModifier } from "#modifiers/modifier";
import { PostSummonPhase } from "#phases/post-summon-phase";
import { GameManager } from "#test/framework/game-manager";
import { NumberHolder } from "#utils/common";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("FuQuan mechanics", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;
  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });
  beforeEach(async () => {
    game = new GameManager(phaserGame);
    game.override.battleStyle("single").enemySpecies(SpeciesId.MAGIKARP).enemyAbility(AbilityId.BALL_FETCH);
    await game.classicMode.runToSummon(SpeciesId.CHARIZARD);
  });

  it("retains all four fusion types and the per-stat maxima", () => {
    const pokemon = game.field.getPlayerPokemon();
    pokemon.fusionSpecies = speciesDataRegistry.getSpecies(SpeciesId.VENUSAUR);
    pokemon.fusionFormIndex = 0;
    expect(new Set(pokemon.getTypes())).toEqual(
      new Set([PokemonType.FIRE, PokemonType.FLYING, PokemonType.GRASS, PokemonType.POISON]),
    );
    const stats = pokemon.calculateBaseStats();
    expect(stats).toEqual([80, 84, 83, 109, 100, 100]);
  });

  it("triggers Quick Strike on entry and displays the Chinese message", () => {
    const pokemon = game.field.getPlayerPokemon();
    const enemy = game.field.getEnemyPokemon();
    game.scene.modifiers.push(new QuickStrikeScrollModifier(modifierTypes.QUICK_STRIKE_SCROLL(), pokemon.id, 1));
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(enemy, "isOnField").mockReturnValue(true);
    const damage = vi.spyOn(enemy, "damageAndUpdate");
    const messages = vi.spyOn(game.scene.phaseManager, "queueMessage");
    const phase = new PostSummonPhase(pokemon.getBattlerIndex());
    vi.spyOn(phase, "end").mockImplementation(() => {});
    phase.start();
    expect(damage).toHaveBeenCalled();
    expect(messages).toHaveBeenCalledWith("触发了瞬击！");
  });

  it("applies each distinct fused ability once with the correct identity", () => {
    const pokemon = game.field.getPlayerPokemon();
    pokemon.fusionSpecies = speciesDataRegistry.getSpecies(SpeciesId.VENUSAUR);
    pokemon.fusionFormIndex = 0;
    pokemon.customPokemonData.ability = AbilityId.HUGE_POWER;
    pokemon.fusionCustomPokemonData = new CustomPokemonData({ ability: AbilityId.PURE_POWER });
    const originalAbility = pokemon.getAbility();
    const statVal = new NumberHolder(100);
    applyAbAttrs("StatMultiplierAbAttr", {
      pokemon,
      stat: Stat.ATK,
      statVal,
      move: allMoves[MoveId.TACKLE],
      simulated: true,
    });
    expect(statVal.value).toBe(400);
    expect(pokemon.getAbilityAttrs("StatMultiplierAbAttr")).toHaveLength(2);
    expect(pokemon.hasAbilityWithAttr("StatMultiplierAbAttr")).toBe(true);
    expect(pokemon.getAbility()).toBe(originalAbility);
  });
});
