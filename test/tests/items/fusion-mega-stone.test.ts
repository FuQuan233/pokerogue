import { speciesDataRegistry } from "#app/global-species-data-registry";
import { modifierTypes } from "#data/data-lists";
import { AbilityId } from "#enums/ability-id";
import { FormChangeItem } from "#enums/form-change-item";
import { ModifierTier } from "#enums/modifier-tier";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import type { PokemonFormChangeItemModifier } from "#modifiers/modifier";
import { modifierPool } from "#modifiers/modifier-pools";
import {
  type FormChangeItemModifierType,
  getFormChangeItemPool,
  getRareFormChangeWeightMultiplier,
} from "#modifiers/modifier-type";
import { PokemonData } from "#system/pokemon-data";
import { GameManager } from "#test/framework/game-manager";
import * as Utils from "#utils/common";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Items - fusion Mega stones", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;
  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });
  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override
      .moveset([MoveId.SPLASH])
      .ability(AbilityId.BALL_FETCH)
      .enemySpecies(SpeciesId.MAGIKARP)
      .enemyAbility(AbilityId.BALL_FETCH)
      .enemyMoveset(MoveId.SPLASH);
  });

  it("requires a bracelet and generates a stone for a Mega-capable secondary", async () => {
    await game.classicMode.startBattle(SpeciesId.SPHEAL, SpeciesId.GYARADOS);
    const pokemon = game.field.getPlayerPokemon();
    pokemon.fuse(game.scene.getPlayerParty()[1]);
    expect(getFormChangeItemPool([pokemon], true)).toEqual([]);
    await game.scene.addModifier(modifierTypes.MEGA_BRACELET().newModifier()!);
    expect(getFormChangeItemPool([pokemon], true)).toEqual([FormChangeItem.GYARADOSITE]);
    const stone = modifierTypes.RARE_FORM_CHANGE_ITEM().generateType([pokemon]) as FormChangeItemModifierType;
    expect(stone.formChangeItem).toBe(FormChangeItem.GYARADOSITE);
    expect(stone.selectFilter!(pokemon)).toBeNull();
    const mainForm = pokemon.formIndex;
    const heldStone = stone.newModifier(pokemon) as PokemonFormChangeItemModifier;
    await game.scene.addModifier(heldStone);
    game.move.select(MoveId.SPLASH);
    await game.toNextTurn();
    expect(pokemon.getFusionFormKey()).toBe("mega");
    expect(pokemon.formIndex).toBe(mainForm);
    expect(pokemon.species.speciesId).toBe(SpeciesId.SPHEAL);
    expect(getFormChangeItemPool([pokemon], true)).not.toContain(FormChangeItem.GYARADOSITE);
    const restored = new PokemonData(JSON.parse(JSON.stringify(new PokemonData(pokemon)))).toPokemon();
    expect(restored.getFusionFormKey()).toBe("mega");
    heldStone.active = false;
    expect(heldStone.apply(pokemon, false)).toBe(true);
    game.move.select(MoveId.SPLASH);
    await game.toNextTurn();
    expect(pokemon.getFusionFormKey()).toBe("");
    expect(pokemon.formIndex).toBe(mainForm);
  });

  it("includes both bodies and deduplicates shared stones", async () => {
    await game.classicMode.startBattle(SpeciesId.GYARADOS);
    const pokemon = game.field.getPlayerPokemon();
    await game.scene.addModifier(modifierTypes.MEGA_BRACELET().newModifier()!);
    pokemon.fusionSpecies = speciesDataRegistry.getSpecies(SpeciesId.CHARIZARD);
    pokemon.fusionFormIndex = 0;
    expect(getFormChangeItemPool([pokemon], true)).toEqual(
      expect.arrayContaining([
        FormChangeItem.GYARADOSITE,
        FormChangeItem.CHARIZARDITE_X,
        FormChangeItem.CHARIZARDITE_Y,
      ]),
    );
    pokemon.fusionSpecies = speciesDataRegistry.getSpecies(SpeciesId.GYARADOS);
    expect(getFormChangeItemPool([pokemon], true)).toEqual([FormChangeItem.GYARADOSITE]);
  });

  it("doubles Mega weight while preserving other rare form items", async () => {
    await game.classicMode.startBattle(SpeciesId.GYARADOS, SpeciesId.KYOGRE);
    await game.scene.addModifier(modifierTypes.MEGA_BRACELET().newModifier()!);
    const [gyarados, kyogre] = game.scene.getPlayerParty();
    expect(getRareFormChangeWeightMultiplier([gyarados])).toBe(2);
    expect(getRareFormChangeWeightMultiplier([kyogre])).toBe(1);
    expect(getRareFormChangeWeightMultiplier([gyarados, kyogre])).toBe(1.5);
    const rng = vi.spyOn(Utils, "randSeedInt");
    const generated: FormChangeItem[] = [];
    for (let index = 0; index < 3; index++) {
      rng.mockReturnValueOnce(index);
      generated.push(
        (modifierTypes.RARE_FORM_CHANGE_ITEM().generateType([gyarados, kyogre]) as FormChangeItemModifierType)
          .formChangeItem,
      );
      expect(rng).toHaveBeenLastCalledWith(3);
    }
    expect(generated).toEqual([FormChangeItem.GYARADOSITE, FormChangeItem.GYARADOSITE, FormChangeItem.BLUE_ORB]);
    rng.mockRestore();
    const entry = modifierPool[ModifierTier.ROGUE].find(e => e.modifierType.id === "RARE_FORM_CHANGE_ITEM")!;
    for (const [wave, weight] of [
      [1, 12],
      [51, 24],
      [101, 36],
      [151, 48],
      [251, 48],
    ]) {
      game.scene.currentBattle.waveIndex = wave;
      expect(typeof entry.weight === "function" && entry.weight([gyarados], 0)).toBe(weight);
      expect(typeof entry.weight === "function" && entry.weight([kyogre], 0)).toBe(weight / 2);
    }
  });
});
