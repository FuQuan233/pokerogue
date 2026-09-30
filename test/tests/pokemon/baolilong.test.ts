import { speciesDataRegistry } from "#app/global-species-data-registry";
import { speciesEggMoves } from "#balance/egg-moves";
import { EvolutionItem } from "#balance/pokemon-evolutions";
import { getTmNumber, tmPoolTiers } from "#balance/tm-pool-tiers";
import { getBaolilongAtlas, registerBaolilongIcons } from "#data/baolilong-assets";
import { allMoves, modifierTypes } from "#data/data-lists";
import { Gender } from "#data/gender";
import { AbilityId } from "#enums/ability-id";
import { ModifierTier } from "#enums/modifier-tier";
import { MoveId } from "#enums/move-id";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesId } from "#enums/species-id";
import { EvolutionItemModifier } from "#modifiers/modifier";
import { EvolutionItemModifierType, type ModifierTypeGenerator, TmModifierType } from "#modifiers/modifier-type";
import { PokemonData } from "#system/pokemon-data";
import { GameManager } from "#test/framework/game-manager";
import * as Utils from "#utils/common";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import icons from "../../../src/assets/baolilong/icons.json";

describe("Baolilong evolution", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;

  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });
  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override
      .battleStyle("single")
      .enemySpecies(SpeciesId.MAGIKARP)
      .enemyAbility(AbilityId.BALL_FETCH)
      .enemyMoveset(MoveId.SPLASH)
      .startingLevel(20);
  });

  it("uses custom water/ice stats, ability, and level moves", () => {
    const actual = speciesDataRegistry.data[SpeciesId.BAOLILONG];
    const source = speciesDataRegistry.data[SpeciesId.GYARADOS];
    expect(actual.species.baseStats).toEqual([490, 40, 50, 55, 50, 25]);
    expect(actual.species.baseTotal).toBe(710);
    expect(actual.species.getPassiveAbility()).toBe(AbilityId.GALE_WINGS);
    expect(actual.species.type1).toBe(PokemonType.WATER);
    expect(actual.species.type2).toBe(PokemonType.ICE);
    for (const key of ["ability1", "ability2", "abilityHidden"] as const) {
      expect(actual.species[key]).toBe(AbilityId.KUAI_LAI_BAO_BAO);
    }
    expect(actual.levelMoves).toEqual([
      [1, MoveId.WATER_GUN],
      [1, MoveId.SCARY_FACE],
      [1, MoveId.POWDER_SNOW],
      [7, MoveId.BELLY_DRUM],
      [13, MoveId.ROLLOUT],
      [19, MoveId.AURORA_BEAM],
      [25, MoveId.HAZE],
      [31, MoveId.BRINE],
      [37, MoveId.RAIN_DANCE],
      [43, MoveId.BOUNCY_BUBBLE],
      [49, MoveId.ICE_BEAM],
      [55, MoveId.HYDRO_PUMP],
      [61, MoveId.HURRICANE],
      [67, MoveId.FREEZE_DRY],
      [73, MoveId.BLIZZARD],
      [79, MoveId.SPLISHY_SPLASH],
      [85, MoveId.WATER_SPOUT],
    ]);
    expect(actual.tms).toEqual(expect.arrayContaining(source.tms));
    expect(actual.species.forms).toHaveLength(0);
    expect(actual.starter).toBe(SpeciesId.SPHEAL);
    expect(actual.prevolution).toBe(SpeciesId.SPHEAL);
    expect(actual.starterCost).toBeUndefined();
    expect(actual.species.getName()).toBe("豹鲤龙");
    expect(actual.species.getCryKey()).toBe("cry/130");
  });

  it("includes all Gyarados moves and every Water/Ice move in compatible TMs", async () => {
    await game.classicMode.runToSummon(SpeciesId.BAOLILONG);
    const pokemon = game.field.getPlayerPokemon();
    const source = speciesDataRegistry.data[SpeciesId.GYARADOS];
    const required = new Set([
      ...speciesDataRegistry.getTms(SpeciesId.GYARADOS),
      ...source.levelMoves.map(([, move]) => move),
      ...speciesDataRegistry.getLevelMoves(SpeciesId.MAGIKARP).map(([, move]) => move),
      ...speciesEggMoves[SpeciesId.MAGIKARP],
      ...allMoves.filter(move => [PokemonType.WATER, PokemonType.ICE].includes(move.type)).map(move => move.id),
    ]);
    for (const move of required) {
      expect(pokemon.isTmCompatible(move), MoveId[move]).toBe(true);
      expect(tmPoolTiers[move], MoveId[move]).toBeDefined();
      expect(getTmNumber(move), MoveId[move]).not.toBeNull();
    }
    expect(getTmNumber(MoveId.MEGA_PUNCH)).toBe("001");
    expect(getTmNumber(MoveId.BOUNCY_BUBBLE)).toBe(String(1000 + MoveId.BOUNCY_BUBBLE));
    const missing = [...required].filter(move => allMoves[move].isUnimplemented);
    console.log("Baolilong TM audit", {
      explicitTms: speciesDataRegistry.data[SpeciesId.BAOLILONG].tms.length,
      unimplemented: missing.map(move => MoveId[move]),
    });
  });

  it("can roll newly registered TMs, including its own level moves, and learn them", async () => {
    game.override.moveset(MoveId.SPLASH);
    await game.classicMode.startBattle(SpeciesId.BAOLILONG);
    const pokemon = game.field.getPlayerPokemon();
    const rng = vi.spyOn(Utils, "randSeedInt");
    for (const move of [MoveId.BOUNCY_BUBBLE, MoveId.FREEZE_DRY, MoveId.DRAGON_ASCENT, MoveId.BITE]) {
      const tier = tmPoolTiers[move];
      const candidates = pokemon
        .getCompatibleTms(true, true, true)
        .filter(id => tmPoolTiers[id] === tier && !allMoves[id].isUnimplemented);
      expect(candidates).toContain(move);
      rng.mockReturnValueOnce(candidates.indexOf(move));
      const factory =
        tier === ModifierTier.COMMON
          ? modifierTypes.TM_COMMON
          : tier === ModifierTier.GREAT
            ? modifierTypes.TM_GREAT
            : modifierTypes.TM_ULTRA;
      const tm = factory().generateType([pokemon]) as TmModifierType;
      expect(tm.moveId).toBe(move);
      expect(tm.selectFilter!(pokemon)).toBeNull();
    }
    rng.mockRestore();
    const tm = new TmModifierType(MoveId.BOUNCY_BUBBLE);
    await game.scene.addModifier(tm.newModifier(pokemon)!);
    game.move.select(MoveId.SPLASH);
    await game.toNextTurn();
    expect(pokemon.getMoveset().some(move => move.moveId === MoveId.BOUNCY_BUBBLE)).toBe(true);
  });

  it("requires the Spheal Stone, rejects other species, and preserves Sealeo's level evolution", async () => {
    await game.classicMode.runToSummon(SpeciesId.SPHEAL, SpeciesId.MAGIKARP);
    const [spheal, magikarp] = game.scene.getPlayerParty();
    const evolutions = speciesDataRegistry.getEvolutions(SpeciesId.SPHEAL);
    const evolution = evolutions.find(e => e.speciesId === SpeciesId.BAOLILONG)!;
    expect(evolution.validate(spheal)).toBe(false);
    expect(evolution.validate(spheal, false, EvolutionItem.WATER_STONE)).toBe(false);
    expect(evolution.validate(spheal, false, EvolutionItem.SPHEAL_STONE)).toBe(true);
    expect(evolutions.find(e => e.speciesId === SpeciesId.SEALEO)?.level).toBe(32);
    const type = new EvolutionItemModifierType(EvolutionItem.SPHEAL_STONE);
    expect(type.name).toBe("海豹球进化石");
    expect(type.selectFilter!(spheal)).toBeNull();
    expect(type.selectFilter!(magikarp)).not.toBeNull();
    const enqueue = vi.spyOn(game.scene.phaseManager, "unshiftNew");
    expect(new EvolutionItemModifier(type, spheal.id).apply(spheal)).toBe(true);
    expect(enqueue).toHaveBeenCalledWith("EvolutionPhase", spheal, evolution, spheal.level - 1);
  });

  it.each([false, true])("evolves and survives save restoration (shiny=%s)", async shiny => {
    await game.classicMode.runToSummon(SpeciesId.SPHEAL);
    const spheal = game.field.getPlayerPokemon();
    game.override.shiny(null);
    spheal.shiny = shiny;
    spheal.gender = Gender.FEMALE;
    spheal.abilityIndex = 2;
    const evolution = speciesDataRegistry
      .getEvolutions(SpeciesId.SPHEAL)
      .find(e => e.speciesId === SpeciesId.BAOLILONG)!;
    await spheal.evolve(evolution, spheal.getSpeciesForm());
    expect(spheal.species.speciesId).toBe(SpeciesId.BAOLILONG);
    expect(spheal.getSpeciesForm().getAbility(spheal.abilityIndex)).toBe(AbilityId.KUAI_LAI_BAO_BAO);
    const restored = new PokemonData(JSON.parse(JSON.stringify(new PokemonData(spheal)))).toPokemon();
    expect(restored.species.speciesId).toBe(SpeciesId.BAOLILONG);
    expect(restored.shiny).toBe(shiny);
    expect(restored.gender).toBe(Gender.FEMALE);
    expect(restored.getSpeciesForm().baseStats).toEqual([490, 40, 50, 55, 50, 25]);
  });

  it("runs the actual item-triggered evolution without the old Gyarados evolution move", async () => {
    game.override.moveset(MoveId.SPLASH);
    await game.classicMode.startBattle(SpeciesId.SPHEAL);
    const spheal = game.field.getPlayerPokemon();
    const type = new EvolutionItemModifierType(EvolutionItem.SPHEAL_STONE);
    expect(new EvolutionItemModifier(type, spheal.id).apply(spheal)).toBe(true);
    game.endPhase();
    await game.phaseInterceptor.to("EndEvolutionPhase");
    expect(spheal.species.speciesId).toBe(SpeciesId.BAOLILONG);
    expect(spheal.getMoveset().some(move => move?.moveId === MoveId.BITE)).toBe(false);
  });

  it("offers the stone in the normal evolution-item pool even after pausing evolution", async () => {
    await game.classicMode.runToSummon(SpeciesId.SPHEAL);
    const spheal = game.field.getPlayerPokemon();
    spheal.pauseEvolutions = true;
    const generator = modifierTypes.EVOLUTION_ITEM() as ModifierTypeGenerator;
    const item = generator.generateType([spheal]) as EvolutionItemModifierType;
    expect(item.evolutionItem).toBe(EvolutionItem.SPHEAL_STONE);
    expect(item.iconImage).toBe("spheal_stone");
  });

  it("resolves both genders and every shiny tier to shipped front/back atlases", () => {
    const species = speciesDataRegistry.getSpecies(SpeciesId.BAOLILONG);
    for (const female of [false, true]) {
      for (const shiny of [false, true]) {
        for (const back of [false, true]) {
          for (const variant of [0, 1, 2]) {
            const path = species.getSpriteAtlasPath(female, 0, shiny, variant, back);
            const atlas = getBaolilongAtlas(path);
            expect(atlas, path).toBeDefined();
            expect(atlas!.data.frames["0001.png"]).toBeDefined();
            expect(icons.frames).toHaveProperty(species.getIconId(female, 0, shiny, variant));
          }
        }
      }
    }
    expect(getBaolilongAtlas("130")).toBeUndefined();
  });
});

describe("Baolilong icon atlas registration", () => {
  it("adds real custom frames without changing existing frames, and is idempotent", () => {
    const manager = new Phaser.Textures.TextureManager(new Phaser.Game({ type: Phaser.HEADLESS }));
    const items = manager.createCanvas("items", 32, 32)!;
    const party = manager.createCanvas("pokemon_icons_3", 32, 32)!;
    const oldFrame = party.add("363", 0, 0, 0, 20, 20);
    const custom = manager.createCanvas("baolilong_icons", 88, 32)!;
    for (const [key, { frame }] of Object.entries(icons.frames)) {
      custom.add(key, 0, frame.x, frame.y, frame.w, frame.h);
    }
    registerBaolilongIcons(manager);
    registerBaolilongIcons(manager);
    expect(party.get("363")).toBe(oldFrame);
    expect(party.get("1900").source).toBe(custom.source[0]);
    expect(party.get("1900s").cutX).toBe(32);
    expect(items.get("spheal_stone").cutX).toBe(64);
    expect(party.source).toHaveLength(2);
    expect(items.source).toHaveLength(2);
  });
});
