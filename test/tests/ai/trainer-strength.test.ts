import { __INTERNAL_TEST_EXPORTS } from "#ai/ai-moveset-gen";
import { chooseTrainerMovesetSlot } from "#ai/trainer-moveset";
import { chooseTrainerMove, getKnownIncomingDamage } from "#ai/trainer-tactics";
import { modifierTypes } from "#data/data-lists";
import { getTrainerHealingItem, getTrainerLoadout, limitTrainerItems } from "#data/trainer-loadout";
import { getTrainerStrength, strengthenTrainerPokemon } from "#data/trainer-strength";
import { Weather } from "#data/weather";
import { AbilityId } from "#enums/ability-id";
import { BattleType } from "#enums/battle-type";
import { MoveId } from "#enums/move-id";
import { MoveUseMode } from "#enums/move-use-mode";
import { Nature } from "#enums/nature";
import { SpeciesId } from "#enums/species-id";
import { Stat } from "#enums/stat";
import { TrainerType } from "#enums/trainer-type";
import { WeatherType } from "#enums/weather-type";
import { BaseStatModifier, HitHealModifier, TurnHealModifier } from "#modifiers/modifier";
import { PokemonMove } from "#moves/pokemon-move";
import { ModifierData } from "#system/modifier-data";
import { GameManager } from "#test/framework/game-manager";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Classic trainer strength and tactics", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;
  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });
  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override
      .battleType(BattleType.TRAINER)
      .randomTrainer({ trainerType: TrainerType.ACE_TRAINER })
      .startingWave(121)
      .battleStyle("single")
      .startingLevel(100)
      .enemyLevel(100)
      .enemySpecies(SpeciesId.ALAKAZAM)
      .ability(AbilityId.BALL_FETCH)
      .enemyAbility(AbilityId.BALL_FETCH)
      .moveset(MoveId.SPLASH)
      .enemyMoveset([MoveId.PSYCHIC, MoveId.RECOVER, MoveId.CALM_MIND, MoveId.QUICK_ATTACK]);
  });
  const pool = (...moves: MoveId[]) => moves.map(m => new PokemonMove(m));

  it.each([
    [29, 0],
    [30, 1],
    [80, 1],
    [94, 1],
    [95, 2],
    [144, 2],
    [145, 6],
  ])("reduces boss vitamins before wave 95: wave %i", async (wave, stacks) => {
    game.override.randomTrainer({ trainerType: TrainerType.BROCK }).startingWave(wave);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const vitamins = getTrainerLoadout(game.field.getEnemyPokemon()).filter(m => m instanceof BaseStatModifier);
    expect(getTrainerStrength()?.vitaminStacks).toBe(stacks);
    if (stacks === 0) {
      expect(vitamins).toHaveLength(0);
    } else {
      expect(vitamins).toHaveLength(4);
      expect(vitamins.map(m => m.stackCount).sort()).toEqual([stacks, stacks, stacks, stacks + Number(wave >= 145)]);
    }
  });

  it("gives attackers HP, both defenses and offense without speed vitamins, with reloadable item types", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    const items = getTrainerLoadout(enemy);
    const vitamins = items.filter(m => m instanceof BaseStatModifier);
    expect(vitamins.map(m => m.getArgs().at(-1)).sort()).toEqual([Stat.HP, Stat.DEF, Stat.SPDEF, Stat.SPATK].sort());
    expect(vitamins.every(m => m.stackCount === 1)).toBe(true);
    for (const item of items) {
      const restored = new ModifierData(item, false).toModifier(item.constructor);
      expect(restored?.match(item)).toBe(true);
      expect(restored?.stackCount).toBe(item.stackCount);
    }
    expect(enemy.nature).toBe(Nature.TIMID);
    expect(enemy.ivs.every(iv => iv >= 25)).toBe(true);
    expect(game.scene.findModifiers(m => m.type.id === "LUCKY_EGG", false)).toHaveLength(0);
  });

  it.each([29, 95, 145, 195])("removes extra and restored NPC speed vitamins at wave %i", async wave => {
    game.override.randomTrainer({ trainerType: TrainerType.BROCK }).startingWave(wave);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    const type = modifierTypes.BASE_STAT_BOOSTER().generateType([enemy], [Stat.SPD])!;
    type.id = "BASE_STAT_BOOSTER";
    const speed = type.newModifier(enemy) as BaseStatModifier;
    speed.stackCount = 3;
    const restored = new ModifierData(speed, false).toModifier(speed.constructor) as BaseStatModifier;
    await game.scene.addEnemyModifier(restored, true);
    limitTrainerItems(enemy);
    game.scene.updateModifiers(false);
    expect(
      enemy.getHeldItems().filter(m => m instanceof BaseStatModifier && m.getArgs().at(-1) === Stat.SPD),
    ).toHaveLength(0);
  });

  it("gives late bosses full IVs, full-team passives and a stronger loadout", async () => {
    game.override.randomTrainer({ trainerType: TrainerType.BROCK }).startingWave(151);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    expect(getTrainerStrength()?.boss).toBe(true);
    for (const enemy of game.scene.getEnemyParty()) {
      expect(enemy.ivs).toEqual([31, 31, 31, 31, 31, 31]);
      expect(enemy.passive).toBe(true);
      expect(
        getTrainerLoadout(enemy)
          .filter(m => m instanceof BaseStatModifier)
          .every(m => m.stackCount >= 6),
      ).toBe(true);
    }
  });

  it.each([95, 144])("caps actual midgame inventory including random healing items at wave %i", async wave => {
    game.override.randomTrainer({ trainerType: TrainerType.BROCK }).startingWave(wave);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    for (const enemy of game.scene.getEnemyParty()) {
      const items = enemy.getHeldItems();
      expect(
        items
          .filter(m => ["LEFTOVERS", "SHELL_BELL"].includes(m.type.id))
          .reduce((sum, item) => sum + item.stackCount, 0),
      ).toBeLessThanOrEqual(1);
      expect(items.filter(m => m instanceof BaseStatModifier).every(m => m.stackCount <= 2)).toBe(true);
    }
  });

  it("does not apply to wild encounters", async () => {
    game.override.battleType(BattleType.WILD);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    const before = [...enemy.ivs];
    strengthenTrainerPokemon(enemy, 0, 1);
    expect(getTrainerStrength()).toBeNull();
    expect(getTrainerLoadout(enemy)).toEqual([]);
    expect(enemy.ivs).toEqual(before);
    expect(chooseTrainerMove(enemy, pool(MoveId.PSYCHIC))).toBeNull();
  });

  it.each([
    94, 95, 144, 145, 195,
  ])("restricts healing to one tank and one attacker, including extra item sources at wave %i", async wave => {
    game.override.randomTrainer({ trainerType: TrainerType.BROCK }).startingWave(wave);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const party = game.scene.getEnemyParty();
    expect(party.length).toBeGreaterThanOrEqual(2);
    for (const [i, pokemon] of party.entries()) {
      vi.spyOn(pokemon, "isFusion").mockReturnValue(false);
      const form = pokemon.getSpeciesForm();
      vi.spyOn(pokemon, "getSpeciesForm").mockReturnValue(
        Object.assign(Object.create(Object.getPrototypeOf(form)), form, {
          baseStats: i === 0 ? [200, 30, 200, 30, 200, 30] : [80, 50, 50, 180 - i, 50, 100],
        }),
      );
    }
    expect(getTrainerHealingItem(party[0])).toBe("LEFTOVERS");
    expect(getTrainerHealingItem(party[1])).toBe("SHELL_BELL");
    for (const pokemon of party.slice(2)) {
      expect(getTrainerHealingItem(pokemon)).toBeUndefined();
    }
    game.scene.clearEnemyHeldItemModifiers();
    for (const pokemon of party) {
      // Simulate excessive random/special/old-save items, even without a populated type id.
      const leftovers = modifierTypes.LEFTOVERS().newModifier(pokemon) as TurnHealModifier;
      const bell = modifierTypes.SHELL_BELL().newModifier(pokemon) as HitHealModifier;
      leftovers.stackCount = 4;
      bell.stackCount = 4;
      await game.scene.addEnemyModifier(leftovers, true);
      await game.scene.addEnemyModifier(bell, true);
    }
    for (const pokemon of party) {
      limitTrainerItems(pokemon);
    }
    const cap = wave >= 95 && wave < 145 ? 1 : 2;
    const items = game.scene.findModifiers(() => true, false);
    const leftovers = items.filter((m): m is TurnHealModifier => m instanceof TurnHealModifier && m.stackCount > 0);
    const bells = items.filter((m): m is HitHealModifier => m instanceof HitHealModifier && m.stackCount > 0);
    expect(leftovers.map(m => [m.pokemonId, m.stackCount])).toEqual([[party[0].id, cap]]);
    expect(bells.map(m => [m.pokemonId, m.stackCount])).toEqual([[party[1].id, cap]]);
    // Fainting and changing field order must not promote another holder.
    party[0].hp = 0;
    party.reverse();
    for (const pokemon of party) {
      limitTrainerItems(pokemon);
    }
    expect(leftovers[0].stackCount).toBe(cap);
    expect(bells[0].stackCount).toBe(cap);
  });

  it("opens egg moves at the new level gates without granting any outside the species egg pool", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    enemy.level = 59;
    const eggs = new Map<MoveId, number>();
    const levels = new Map([[MoveId.PSYCHIC, 100]]);
    __INTERNAL_TEST_EXPORTS.getAndWeightEggMoves(enemy, levels, eggs);
    expect(eggs.size).toBe(0);
    enemy.level = 60;
    __INTERNAL_TEST_EXPORTS.getAndWeightEggMoves(enemy, levels, eggs);
    expect(eggs.size).toBeGreaterThan(0);
  });

  it("retains existing signature slots and chooses a complementary move from the allowed pool", async () => {
    game.override.randomTrainer({ trainerType: TrainerType.BROCK });
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    enemy.moveset = pool(MoveId.PSYCHIC);
    const chosen = chooseTrainerMovesetSlot(
      enemy,
      [
        [MoveId.CONFUSION, 100],
        [MoveId.SHADOW_BALL, 100],
      ],
      MoveId.CONFUSION,
    );
    expect(chosen).toBe(MoveId.SHADOW_BALL);
    expect(enemy.moveset.map(m => m.moveId)).toEqual([MoveId.PSYCHIC]);
  });

  it("uses actual damage to prefer special attacks for a special attacker", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    const chosen = chooseTrainerMove(enemy, pool(MoveId.PSYCHIC, MoveId.ZEN_HEADBUTT))!;
    expect(chosen.move).toBe(MoveId.PSYCHIC);
  });

  it("avoids healing at full HP and uses recovery when injured safely", async () => {
    await game.classicMode.startBattle(SpeciesId.BLISSEY);
    const enemy = game.field.getEnemyPokemon();
    expect(chooseTrainerMove(enemy, pool(MoveId.QUICK_ATTACK, MoveId.RECOVER))?.move).toBe(MoveId.QUICK_ATTACK);
    enemy.hp = Math.floor(enemy.getMaxHp() * 0.4);
    expect(chooseTrainerMove(enemy, pool(MoveId.QUICK_ATTACK, MoveId.RECOVER))?.move).toBe(MoveId.RECOVER);
  });

  it("avoids a maxed-out setup move", async () => {
    await game.classicMode.startBattle(SpeciesId.BLISSEY);
    const enemy = game.field.getEnemyPokemon();
    enemy.setStatStage(Stat.SPATK, 6);
    enemy.setStatStage(Stat.SPDEF, 6);
    expect(chooseTrainerMove(enemy, pool(MoveId.PSYCHIC, MoveId.CALM_MIND))?.move).toBe(MoveId.PSYCHIC);
  });

  it("prioritizes priority attacks that KO before a faster opponent", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    const player = game.field.getPlayerPokemon();
    player.hp = 1;
    player.setStat(Stat.SPD, 9999);
    expect(chooseTrainerMove(enemy, pool(MoveId.PSYCHIC, MoveId.QUICK_ATTACK))?.move).toBe(MoveId.QUICK_ATTACK);
  });

  it("does not pick a move reduced to Splash by dark sky", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    game.scene.arena.weather = new Weather(WeatherType.DARK_SKY, 5);
    expect(chooseTrainerMove(game.field.getEnemyPokemon(), pool(MoveId.MOONBLAST, MoveId.PSYCHIC))?.move).toBe(
      MoveId.PSYCHIC,
    );
  });

  it("evaluates moon-night transformed damage while retaining original move and PP", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    game.scene.arena.weather = new Weather(WeatherType.FULL_MOON, 0);
    const moves = pool(MoveId.GUST, MoveId.QUICK_ATTACK);
    expect(chooseTrainerMove(game.field.getEnemyPokemon(), moves)?.move).toBe(MoveId.GUST);
    expect(moves.every(m => m.ppUsed === 0)).toBe(true);
  });

  it("uses revealed attacks to measure switching risk, without consulting the player's hidden moveset", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    const player = game.field.getPlayerPokemon();
    player.pushMoveHistory({ move: MoveId.TACKLE, targets: [enemy.getBattlerIndex()], useMode: MoveUseMode.NORMAL });
    const before = getKnownIncomingDamage(enemy);
    game.override.moveset(MoveId.HYPER_BEAM);
    expect(getKnownIncomingDamage(enemy)).toBe(before);
    expect(Number.isFinite(before)).toBe(true);
  });

  it("adds the Boss level increase on top of the original level curve", async () => {
    game.override.randomTrainer({ trainerType: TrainerType.BROCK }).startingWave(20);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    expect(game.scene.currentBattle.trainer!.getPartyLevels(20)).toEqual([15, 16]);
  });

  it("does not set up when a revealed attack threatens to KO", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const enemy = game.field.getEnemyPokemon();
    const player = game.field.getPlayerPokemon();
    player.setStat(Stat.ATK, 9999);
    player.pushMoveHistory({ move: MoveId.TACKLE, targets: [enemy.getBattlerIndex()], useMode: MoveUseMode.NORMAL });
    expect(chooseTrainerMove(enemy, pool(MoveId.PSYCHIC, MoveId.CALM_MIND))?.move).toBe(MoveId.PSYCHIC);
  });

  it("sums spread damage over both opponents", async () => {
    game.override.battleStyle("double");
    await game.classicMode.startBattle(SpeciesId.BLISSEY, SpeciesId.BLISSEY);
    const enemy = game.field.getEnemyPokemon();
    const chosen = chooseTrainerMove(enemy, pool(MoveId.HEAT_WAVE, MoveId.FLAMETHROWER));
    expect(chosen?.move).toBe(MoveId.HEAT_WAVE);
    expect(chosen?.targets).toHaveLength(2);
  });
});
