import { speciesDataRegistry } from "#app/global-species-data-registry";
import { allAbilities } from "#data/data-lists";
import { applyTrainerFusion, getTrainerFusionCount, selectTrainerFusion } from "#data/trainer-fusion";
import { trainerFusionPools } from "#data/trainer-fusion-pools";
import { getTrainerVarietyPool } from "#data/trainer-fusion-variety";
import { getTrainerBaseStats } from "#data/trainer-strength";
import { AbilityId } from "#enums/ability-id";
import { BattleType } from "#enums/battle-type";
import { MoveId } from "#enums/move-id";
import { PokeballType } from "#enums/pokeball";
import { SpeciesId } from "#enums/species-id";
import { TrainerType } from "#enums/trainer-type";
import { TrainerVariant } from "#enums/trainer-variant";
import { PokemonData } from "#system/pokemon-data";
import { GameManager } from "#test/framework/game-manager";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("Named trainer fusion pools", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;
  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });
  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override
      .battleType(BattleType.TRAINER)
      .randomTrainer({ trainerType: TrainerType.BROCK })
      .startingWave(151)
      .battleStyle("single")
      .startingLevel(100)
      .enemyLevel(100)
      .ability(AbilityId.BALL_FETCH)
      .moveset(MoveId.SPLASH)
      .enemyMoveset(MoveId.SPLASH);
  });

  it("loads all 474 approved builds with four distinct implemented abilities", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const pools = Object.values(trainerFusionPools);
    expect(pools).toHaveLength(158);
    expect(pools.flat()).toHaveLength(474);
    for (const pool of pools) {
      expect(pool).toHaveLength(3);
      for (const build of pool) {
        expect(speciesDataRegistry.getSpecies(build[0])).toBeDefined();
        expect(speciesDataRegistry.getSpecies(build[1])).toBeDefined();
        expect(new Set(build.slice(2)).size).toBe(4);
        for (const id of build.slice(2)) {
          expect(allAbilities[id].name).not.toMatch(/ \(N\)$/);
        }
      }
    }
    expect(trainerFusionPools[TrainerType.ACE_TRAINER]).toBeUndefined();
  });

  it("scales named trainers by wave while ordinary NPCs never receive fusions", () => {
    for (const [wave, count] of [
      [29, 0],
      [30, 0],
      [79, 0],
      [80, 0],
      [94, 0],
      [95, 2],
      [139, 2],
      [140, 3],
    ]) {
      expect(getTrainerFusionCount(TrainerType.BROCK, wave, 6)).toBe(count);
      expect(getTrainerFusionCount(TrainerType.ACE_TRAINER, wave, 6)).toBe(0);
    }
    expect(getTrainerFusionCount(TrainerType.RIVAL, 8, 2)).toBe(0);
    expect(getTrainerFusionCount(TrainerType.RIVAL_3, 55, 6)).toBe(0);
    expect(getTrainerFusionCount(TrainerType.RIVAL_4, 94, 6)).toBe(0);
    expect(getTrainerFusionCount(TrainerType.RIVAL_4, 95, 6)).toBe(2);
    expect(getTrainerFusionCount(TrainerType.RIVAL_6, 195, 6)).toBe(2);
  });

  it("generates three distinct moderate fusions with intact custom abilities before endgame", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const party = game.scene.getEnemyParty();
    expect(party.filter(p => p.isFusion())).toHaveLength(3);
    const ace = party.at(-1)!;
    const builds = party.filter(p => p.isFusion()).map(p => [p.species.speciesId, p.fusionSpecies!.speciesId]);
    expect(new Set(builds.map(b => b.join("/"))).size).toBe(3);
    const build = getTrainerVarietyPool(TrainerType.BROCK, 151).find(
      b => b[0] === ace.species.speciesId && b[1] === ace.fusionSpecies?.speciesId,
    )!;
    expect(build).toBeDefined();
    expect(ace.getAllAbilities().map(a => a.id)).toEqual(build.slice(2));
    expect(getTrainerBaseStats(ace).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(650);
    expect(ace.hp).toBe(ace.getMaxHp());
  });

  it("does not replace early gyms or ordinary trainer species", async () => {
    game.override.startingWave(21);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    expect(game.scene.getEnemyParty().some(p => p.isFusion())).toBe(false);
  });

  it("keeps each named double trainer's fusion pool separate", async () => {
    game.override
      .randomTrainer({ trainerType: TrainerType.TATE, trainerVariant: TrainerVariant.DOUBLE })
      .battleStyle("double");
    await game.classicMode.startBattle(SpeciesId.MAGIKARP, SpeciesId.FEEBAS);
    const trainer = game.scene.currentBattle.trainer!;
    expect(trainer.isDouble()).toBe(true);
    expect(trainer.config.trainerTypeDouble).toBe(TrainerType.LIZA);
    const size = trainer.getPartyTemplate().size;
    for (let i = 0; i < size; i++) {
      const build = selectTrainerFusion(trainer, i);
      if (build) {
        expect(getTrainerVarietyPool(i % 2 ? TrainerType.LIZA : TrainerType.TATE, 151)).toContainEqual(build);
        expect(game.scene.getEnemyParty()[i].fusionSpecies?.speciesId).toBe(build[1]);
      }
    }
  });

  it.each([95, 145, 195])("varies rival fusions by run seed without the fixed Rayquaza pair at wave %i", async wave => {
    game.override.randomTrainer({ trainerType: TrainerType.RIVAL_6 }).startingWave(wave);
    await game.classicMode.startBattle(SpeciesId.BLISSEY);
    const trainer = game.scene.currentBattle.trainer!;
    const size = trainer.getPartyTemplate().size;
    const chosen = selectTrainerFusion(trainer, size - 1)!;
    expect(selectTrainerFusion(trainer, size - 1)).toEqual(chosen);
    const combinations = new Set<string>();
    for (let i = 0; i < 20; i++) {
      game.scene.seed = `fusion-variety-${i}`;
      const ace = selectTrainerFusion(trainer, size - 1)!;
      const partner = selectTrainerFusion(trainer, size - 2)!;
      expect(ace.slice(0, 2)).not.toEqual([SpeciesId.RAYQUAZA, SpeciesId.ARCHALUDON]);
      expect(ace).not.toEqual(partner);
      if (wave < 195) {
        expect(getTrainerVarietyPool(trainer.config.trainerType, wave)).toContainEqual(ace);
      }
      combinations.add(ace.slice(0, 2).join("/"));
    }
    expect(combinations.size).toBeGreaterThan(5);
  });

  it("provides moderate nonlegendary builds for every named trainer, with implemented abilities", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    for (const wave of [95, 145]) {
      const unique = new Set<string>();
      for (const type of Object.keys(trainerFusionPools).map(Number)) {
        const pool = getTrainerVarietyPool(type, wave);
        const expectedSize =
          type >= TrainerType.RIVAL && type <= TrainerType.RIVAL_6
            ? 60
            : type >= TrainerType.BROCK && type <= TrainerType.GRUSHA
              ? 20
              : 30;
        expect(pool, TrainerType[type]).toHaveLength(expectedSize);
        const pairs = pool.map(build => [build[0], build[1]].sort((a, b) => a - b).join("/"));
        expect(new Set(pairs).size, TrainerType[type]).toBe(expectedSize);
        let crossTypeCount = 0;
        const roles = new Set<number>();
        for (const build of pool) {
          unique.add([build[0], build[1]].sort((a, b) => a - b).join("/"));
          const forms = [build[0], build[1]].map(id => speciesDataRegistry.getPokemonSpeciesForm(id, 0));
          if (forms[0].type1 !== forms[1].type1) {
            crossTypeCount++;
          }
          const stats = forms[0].baseStats.map((v, i) => Math.max(v, forms[1].baseStats[i]));
          roles.add((stats[2] + stats[4]) / 2 >= Math.max(stats[1], stats[3]) ? 0 : stats[5] >= 85 ? 1 : 2);
          const total = forms[0].baseStats.reduce((sum, v, i) => sum + Math.max(v, forms[1].baseStats[i]), 0);
          expect(total).toBeLessThanOrEqual(wave < 145 ? 600 : 650);
          for (const id of [build[0], build[1]]) {
            const species = speciesDataRegistry.getSpecies(id);
            expect(species.legendary || species.subLegendary || species.mythical).toBeFalsy();
          }
          expect(new Set(build.slice(2)).size).toBe(4);
          for (const id of build.slice(2)) {
            expect(allAbilities[id].name).not.toMatch(/ \(N\)$/);
          }
        }
        expect(crossTypeCount, TrainerType[type]).toBeGreaterThanOrEqual(Math.floor(expectedSize / 2));
        expect(roles.size, TrainerType[type]).toBeGreaterThanOrEqual(2);
      }
      expect(unique.size).toBeGreaterThan(300);
      console.log(`Fusion pool audit: wave=${wave}, trainers=158, unique unordered pairs=${unique.size}`);
    }
  });

  it("round trips species, learned slots, moves, HP and boss bars without rerolling a saved fusion", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const ace = game.scene.getEnemyParty().at(-1)!;
    ace.setBoss(true, 3);
    ace.hp -= 7;
    const data = new PokemonData(ace);
    const restored = new PokemonData(JSON.parse(JSON.stringify(data))).toPokemon(BattleType.TRAINER);
    expect(restored.species.speciesId).toBe(ace.species.speciesId);
    expect(restored.fusionSpecies?.speciesId).toBe(ace.fusionSpecies?.speciesId);
    expect(restored.getAllAbilities().map(a => a.id)).toEqual(ace.getAllAbilities().map(a => a.id));
    expect(restored.customPokemonData.learnedAbilities).toEqual(ace.customPokemonData.learnedAbilities);
    expect(restored.hp).toBe(ace.hp);
    expect(restored.getMoveset().map(m => m.moveId)).toEqual(ace.getMoveset().map(m => m.moveId));
    expect(restored.isBoss()).toBe(true);
  });

  it("includes a normal-form fusion donor's TM pool", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const pokemon = game.field.getEnemyPokemon();
    pokemon.species = speciesDataRegistry.getSpecies(SpeciesId.MAGIKARP);
    pokemon.formIndex = 0;
    pokemon.fusionSpecies = speciesDataRegistry.getSpecies(SpeciesId.ALAKAZAM);
    pokemon.fusionFormIndex = 0;
    const tms = new Map<MoveId, number>();
    __INTERNAL_TEST_EXPORTS!.getAndWeightTmMoves(pokemon, new Map(), new Map(), tms);
    expect(pokemon.getFusionFormKey()).toBe("");
    expect(tms.has(MoveId.SHADOW_BALL)).toBe(true);
  });

  it("preserves learned fusion abilities when a badge holder captures the NPC Pokemon", async () => {
    game.override.startingModifier([{ name: "ROCKET_TEAM_BADGE" }]);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    const trainer = game.scene.currentBattle.trainer!;
    applyTrainerFusion(enemy, trainer, trainer.getPartyTemplate().size - 1);
    const abilities = enemy.getAllAbilities().map(a => a.id);
    const donor = enemy.fusionSpecies!.speciesId;
    game.scene.pokeballCounts[PokeballType.MASTER_BALL] = 1;
    game.doThrowPokeball(PokeballType.MASTER_BALL);
    await game.phaseInterceptor.to("VictoryPhase");
    const caught = game.scene.getPlayerParty().at(-1)!;
    expect(caught.fusionSpecies?.speciesId).toBe(donor);
    expect(caught.getAllAbilities().map(a => a.id)).toEqual(abilities);
    expect(caught.passive).toBe(true);
  });
});

import { __INTERNAL_TEST_EXPORTS } from "#ai/ai-moveset-gen";
