import { speciesDataRegistry } from "#app/global-species-data-registry";
import { allAbilities } from "#data/data-lists";
import { applyTrainerFusion, getTrainerFusionCount, scoreRivalFusion, selectTrainerFusion } from "#data/trainer-fusion";
import { trainerFusionPools } from "#data/trainer-fusion-pools";
import { getTrainerBaseStats, getTrainerOffensiveStat } from "#data/trainer-strength";
import { AbilityId } from "#enums/ability-id";
import { BattleType } from "#enums/battle-type";
import { MoveId } from "#enums/move-id";
import { PokeballType } from "#enums/pokeball";
import { SpeciesId } from "#enums/species-id";
import { Stat } from "#enums/stat";
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

  it("generates the late boss's last three slots with the approved species and custom abilities", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const party = game.scene.getEnemyParty();
    expect(party.filter(p => p.isFusion())).toHaveLength(3);
    const ace = party.at(-1)!;
    expect(ace.species.speciesId).toBe(SpeciesId.STEELIX);
    expect(ace.fusionSpecies?.speciesId).toBe(SpeciesId.GARCHOMP);
    expect(ace.getAllAbilities().map(a => a.id)).toEqual(trainerFusionPools[TrainerType.BROCK]![0].slice(2));
    expect(getTrainerBaseStats(ace)).toEqual([108, 130, 200, 80, 85, 102]);
    expect(getTrainerOffensiveStat(ace)).toBe(Stat.ATK);
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
        expect(trainerFusionPools[i % 2 ? TrainerType.LIZA : TrainerType.TATE]).toContain(build);
        expect(game.scene.getEnemyParty()[i].fusionSpecies?.speciesId).toBe(build[1]);
      }
    }
  });

  it("keeps the late rival Rayquaza ace and chooses its partner deterministically against the party", async () => {
    game.override.randomTrainer({ trainerType: TrainerType.RIVAL_6 });
    await game.classicMode.startBattle(SpeciesId.BLISSEY);
    const trainer = game.scene.currentBattle.trainer!;
    const size = trainer.getPartyTemplate().size;
    expect(selectTrainerFusion(trainer, size - 1)?.[0]).toBe(SpeciesId.RAYQUAZA);
    const pool = trainerFusionPools[TrainerType.RIVAL_6]!.slice(1);
    const chosen = selectTrainerFusion(trainer, size - 2)!;
    const score = scoreRivalFusion(chosen, game.scene.getPlayerParty());
    expect(pool.every(p => score >= scoreRivalFusion(p, game.scene.getPlayerParty()))).toBe(true);
    expect(selectTrainerFusion(trainer, size - 2)).toBe(chosen);
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
    game.scene.pokeballCounts[PokeballType.MASTER_BALL] = 1;
    game.doThrowPokeball(PokeballType.MASTER_BALL);
    await game.phaseInterceptor.to("VictoryPhase");
    const caught = game.scene.getPlayerParty().at(-1)!;
    expect(caught.fusionSpecies?.speciesId).toBe(SpeciesId.GARCHOMP);
    expect(caught.getAllAbilities().map(a => a.id)).toEqual(abilities);
    expect(caught.passive).toBe(true);
  });
});

import { __INTERNAL_TEST_EXPORTS } from "#ai/ai-moveset-gen";
