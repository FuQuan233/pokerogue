import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { defaultStarterSpecies } from "#app/constants";
import { speciesDataRegistry } from "#app/global-species-data-registry";
import { speciesEggMoves } from "#balance/egg-moves";
import { getPassiveCandyCount, getSameSpeciesEggCandyCounts, getValueReductionCandyCounts } from "#balance/starters";
import { iceCaveBiome } from "#biomes/ice-cave";
import { allAbilities, allMoves } from "#data/data-lists";
import { Egg } from "#data/egg";
import { getTubaoqiuAtlas } from "#data/tubaoqiu-assets";
import { AbilityId } from "#enums/ability-id";
import { BiomeId } from "#enums/biome-id";
import { BiomePoolTier } from "#enums/biome-pool-tier";
import { EggSourceType } from "#enums/egg-source-types";
import { EggTier } from "#enums/egg-type";
import { MoveId } from "#enums/move-id";
import { PartyMemberStrength } from "#enums/party-member-strength";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesId } from "#enums/species-id";
import { Stat } from "#enums/stat";
import { TimeOfDay } from "#enums/time-of-day";
import { TrainerPoolTier } from "#enums/trainer-pool-tier";
import { TrainerSlot } from "#enums/trainer-slot";
import { TrainerType } from "#enums/trainer-type";
import { TrainerVariant } from "#enums/trainer-variant";
import { VariantTier } from "#enums/variant-tier";
import { Trainer } from "#field/trainer";
import { GameData } from "#system/game-data";
import { PokemonData } from "#system/pokemon-data";
import { GameManager } from "#test/framework/game-manager";
import { trainerConfigs } from "#trainers/trainer-config";
import * as Utils from "#utils/common";
import { NumberHolder } from "#utils/common";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const id = SpeciesId.TUBAOQIU;
const stats = [Stat.ATK, Stat.SPATK, Stat.DEF, Stat.SPDEF, Stat.SPD] as const;

describe("Tubaoqiu independent starter chain", () => {
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
      .enemySpecies(SpeciesId.MEW)
      .enemyAbility(AbilityId.BALL_FETCH)
      .enemyMoveset(MoveId.SPLASH);
  });

  it("registers an independent 7-cost starter, with Spheal capture/economy and specified moves", () => {
    const data = speciesDataRegistry.getSpeciesData(id);
    const source = speciesDataRegistry.getSpecies(SpeciesId.SPHEAL);
    expect(speciesDataRegistry.getStarter(id)).toBe(id);
    expect(speciesDataRegistry.getPrevolution(id)).toBeNull();
    expect(data.evolutions).toEqual([]);
    expect(data.species.baseStats).toEqual([130, 75, 60, 55, 150, 20]);
    expect(data.species.baseTotal).toBe(490);
    expect([data.species.type1, data.species.type2]).toEqual([PokemonType.WATER, PokemonType.POISON]);
    expect(data.species.catchRate).toBe(source.catchRate);
    expect(data.species.baseExp).toBe(source.baseExp);
    expect(data.species.growthRate).toBe(source.growthRate);
    expect(data.species.getName()).toBe("土豹球");
    expect(data.species.getCryKey()).toBe("cry/363");
    expect(speciesDataRegistry.getStarterCost(id)).toBe(7);
    const cost = speciesDataRegistry.getStarterEconomyCost(id);
    expect(cost).toBe(2);
    expect(getPassiveCandyCount(cost)).toBe(40);
    expect(getValueReductionCandyCounts(cost)).toEqual([25, 60]);
    expect(getSameSpeciesEggCandyCounts(cost, 0)).toBe(30);
    expect(speciesDataRegistry.getEggTier(id)).toBe(EggTier.COMMON);
    expect(speciesEggMoves[id]).toEqual([MoveId.PRECIPICE_BLADES, MoveId.ICE_BEAM, MoveId.SLACK_OFF, MoveId.FOLLOW_ME]);
    expect(data.levelMoves).toEqual([
      [1, MoveId.BUBBLE],
      [1, MoveId.WITHDRAW],
      [1, MoveId.POISON_STING],
      [1, MoveId.POISON_GAS],
      [6, MoveId.WATER_PULSE],
      [8, MoveId.POISON_TAIL],
      [10, MoveId.BRINE],
      [12, MoveId.TOXIC],
      [14, MoveId.SCALD],
      [16, MoveId.TOXIC_SPIKES],
      [18, MoveId.BOUNCY_BUBBLE],
      [20, MoveId.POISON_JAB],
      [22, MoveId.ORIGIN_PULSE],
      [24, MoveId.BANEFUL_BUNKER],
      [26, MoveId.SPLISHY_SPLASH],
      [28, MoveId.BARB_BARRAGE],
      [30, MoveId.SPARKLING_ARIA],
    ]);
    expect(allAbilities[AbilityId.KUAI_LAI_BAO_BAO].id).toBe(AbilityId.KUAI_LAI_BAO_BAO);
    expect(allAbilities[AbilityId.FA_BAO_SHI_LING].name).toBe("发豹施令");
  });

  it("preserves the economy of every other existing starter", () => {
    for (const starter of speciesDataRegistry.getAllStarters()) {
      if (starter !== id) {
        expect(speciesDataRegistry.getStarterEconomyCost(starter)).toBe(speciesDataRegistry.getStarterCost(starter));
      }
    }
  });

  it("loses its power boost while the ability is suppressed", async () => {
    await game.classicMode.startBattle(id);
    const pokemon = game.field.getPlayerPokemon();
    pokemon.suppressAbility();
    const power = new NumberHolder(100);
    applyAbAttrs("MovePowerBoostAbAttr", {
      pokemon,
      opponent: game.field.getEnemyPokemon(),
      move: allMoves[MoveId.ICE_BEAM],
      power,
      simulated: true,
    });
    expect(power.value).toBe(100);
  });

  it("unlocks on a fresh account without unlocking passive or egg moves", () => {
    const data = new GameData(true);
    expect(defaultStarterSpecies).toContain(id);
    expect(data.dexData[id].caughtAttr).not.toBe(0n);
    expect(data.starterData[id].abilityAttr).toBe(1);
    expect(data.starterData[id].passiveAttr).toBe(0);
    expect(data.starterData[id].eggMoves).toBe(0);
    expect(data.getSpeciesStarterValue(id)).toBe(7);
    expect(data.getSpeciesStarterValue(id, 1)).toBe(6);
    expect(data.getSpeciesStarterValue(id, 2)).toBe(5);
  });

  it("loads a pre-existing account without losing the new starter entry", async () => {
    await game.importData("./test/utils/saves/everything.prsv");
    expect(game.scene.gameData.starterData[id]).toBeDefined();
    expect(game.scene.gameData.dexData[id].caughtAttr).not.toBe(0n);
  });

  it("rolls naturally from a common gacha egg with the same weight as Spheal", () => {
    const pool = speciesDataRegistry
      .getSpeciesForEggTier(EggTier.COMMON)
      .filter(s => ![SpeciesId.PHIONE, SpeciesId.MANAPHY, SpeciesId.ETERNATUS].includes(s.speciesId));
    const weights = pool.map(s =>
      Math.floor(
        (((3 - Phaser.Math.Clamp(speciesDataRegistry.getStarterEconomyCost(s.speciesId), 1, 3)) / 3) * 1.5 + 1) * 100,
      ),
    );
    expect(weights[pool.findIndex(s => s.speciesId === id)]).toBe(
      weights[pool.findIndex(s => s.speciesId === SpeciesId.SPHEAL)],
    );
    const roll = weights
      .slice(
        0,
        pool.findIndex(s => s.speciesId === id),
      )
      .reduce((sum, w) => sum + w, 0);
    vi.spyOn(Utils, "randSeedInt").mockReturnValue(roll);
    const egg = new Egg({
      id: 1,
      tier: EggTier.COMMON,
      sourceType: EggSourceType.GACHA_MOVE,
      isShiny: false,
      variantTier: VariantTier.STANDARD,
      eggMoveIndex: 0,
    });
    expect(egg.species).toBe(id);
    expect(egg.generatePlayerPokemon().species.speciesId).toBe(id);
  });

  it("selects from the actual wild Ice Cave pool without a species override", async () => {
    game.override.startingBiome(BiomeId.ICE_CAVE);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    expect(iceCaveBiome.pokemonPool[BiomePoolTier.UNCOMMON][TimeOfDay.ALL]).toContain(id);
    vi.spyOn(Utils, "randSeedInt").mockReturnValue(100);
    const randomItem = Utils.randSeedItem;
    vi.spyOn(Utils, "randSeedItem").mockImplementation(items =>
      Array.from(items).includes(id) ? id : randomItem(items),
    );
    expect(game.scene.arena.randomSpecies(11, 10).speciesId).toBe(id);
  });

  it("generates a real ordinary trainer party member from its configured pool", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    expect(trainerConfigs[TrainerType.SCUBA_DIVER].speciesPools[TrainerPoolTier.COMMON]).toContain(id);
    const trainer = new Trainer(TrainerType.SCUBA_DIVER, TrainerVariant.DEFAULT, 0);
    vi.spyOn(Utils, "randSeedInt").mockReturnValue(200);
    const randomItem = Utils.randSeedItem;
    vi.spyOn(Utils, "randSeedItem").mockImplementation(items =>
      Array.from(items).includes(id) ? id : randomItem(items),
    );
    const species = trainer.genNewPartyMemberSpecies(10, PartyMemberStrength.AVERAGE);
    expect(species.speciesId).toBe(id);
    game.override.enemySpecies(null).enemyAbility(AbilityId.NONE);
    const pokemon = game.scene.addEnemyPokemon(species, 10, TrainerSlot.TRAINER);
    expect(pokemon.getAbility().id).toBe(AbilityId.FA_BAO_SHI_LING);
    expect(pokemon.getMoveset().length).toBeGreaterThan(0);
  });

  it.each([false, true])("round-trips battle saves and resolves every asset for shiny=%s", async shiny => {
    if (shiny) {
      game.override.shiny(true);
    } else {
      game.override.shiny(false);
    }
    await game.classicMode.startBattle(id);
    const pokemon = game.field.getPlayerPokemon();
    game.override.shiny(null);
    pokemon.shiny = shiny;
    const restored = new PokemonData(JSON.parse(JSON.stringify(new PokemonData(pokemon)))).toPokemon();
    expect(restored.species.speciesId).toBe(id);
    expect(restored.shiny).toBe(shiny);
    expect(restored.getAbility().id).toBe(AbilityId.FA_BAO_SHI_LING);
    for (const female of [false, true]) {
      for (const back of [false, true]) {
        for (const variant of [0, 1, 2]) {
          const species = restored.species;
          expect(getTubaoqiuAtlas(species.getSpriteAtlasPath(female, 0, shiny, variant, back))).toBeDefined();
          expect(species.getIconId(female, 0, shiny, variant)).toBe(shiny ? "1901s" : "1901");
        }
      }
    }
  });

  it("replaces other battlers' first abilities on entry without raising its own stats", async () => {
    await game.classicMode.startBattle(id);
    const pokemon = game.field.getPlayerPokemon();
    expect(pokemon.getAbility().id).toBe(AbilityId.FA_BAO_SHI_LING);
    expect(game.field.getEnemyPokemon().getAbility().id).toBe(AbilityId.TRUANT);
    for (const stat of stats) {
      expect(pokemon.getStatStage(stat)).toBe(0);
    }
  });

  it.each([
    MoveId.EARTHQUAKE,
    MoveId.ICE_BEAM,
    MoveId.WATER_GUN,
  ])("applies power boosts only to Ground/Ice (%i)", async moveId => {
    await game.classicMode.startBattle(id);
    const pokemon = game.field.getPlayerPokemon();
    const power = new NumberHolder(100);
    applyAbAttrs("MovePowerBoostAbAttr", {
      pokemon,
      opponent: game.field.getEnemyPokemon(),
      move: allMoves[moveId],
      power,
      simulated: true,
    });
    expect(power.value).toBe(moveId === MoveId.WATER_GUN ? 100 : 150);
  });

  it.each([MoveId.FLAMETHROWER, MoveId.ICE_BEAM])("matches Thick Fat damage reduction (%i)", async move => {
    await game.classicMode.startBattle(id);
    const pokemon = game.field.getPlayerPokemon();
    const enemy = game.field.getEnemyPokemon();
    game.scene.resetSeed();
    const custom = pokemon.getAttackDamage({ source: enemy, move: allMoves[move] }).damage;
    game.override.ability(AbilityId.THICK_FAT);
    game.scene.resetSeed();
    expect(pokemon.getAttackDamage({ source: enemy, move: allMoves[move] }).damage).toBe(custom);
  });

  it("absorbs Water and heals a quarter of maximum HP in an actual turn", async () => {
    game.override.moveset(MoveId.SPLASH).enemyMoveset(MoveId.WATER_GUN);
    await game.classicMode.startBattle(id);
    const pokemon = game.field.getPlayerPokemon();
    pokemon.hp = 1;
    const expected = 1 + Math.floor(pokemon.getMaxHp() / 4);
    game.move.select(MoveId.SPLASH);
    await game.phaseInterceptor.to("TurnEndPhase");
    expect(pokemon.hp).toBe(expected);
  });

  it("uses Earth Eater only when the passive is enabled", async () => {
    game.override.passiveAbility(AbilityId.EARTH_EATER).moveset(MoveId.SPLASH).enemyMoveset(MoveId.EARTHQUAKE);
    await game.classicMode.startBattle(id);
    const pokemon = game.field.getPlayerPokemon();
    pokemon.hp = 1;
    game.move.select(MoveId.SPLASH);
    await game.phaseInterceptor.to("TurnEndPhase");
    expect(pokemon.hp).toBe(1 + Math.floor(pokemon.getMaxHp() / 4));
  });
});
