import { allMoves, modifierTypes } from "#data/data-lists";
import { Status } from "#data/status-effect";
import { getWeatherMultiplierForMove, getWeatherStartMessage, Weather } from "#data/weather";
import { AbilityId } from "#enums/ability-id";
import { ArenaTagType } from "#enums/arena-tag-type";
import { Button } from "#enums/buttons";
import { ModifierTier } from "#enums/modifier-tier";
import { MoveId } from "#enums/move-id";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesId } from "#enums/species-id";
import { Stat } from "#enums/stat";
import { StatusEffect } from "#enums/status-effect";
import { UiMode } from "#enums/ui-mode";
import { WeatherType } from "#enums/weather-type";
import { AbilityLearnerModifier, TmModifier } from "#modifiers/modifier";
import { modifierPool } from "#modifiers/modifier-pools";
import type { TmModifierType } from "#modifiers/modifier-type";
import { getWeatherMove } from "#moves/weather-moves";
import { GameManager } from "#test/framework/game-manager";
import { FightUiHandler } from "#ui/fight-ui-handler";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MoveInfoOverlay } from "../../../src/ui/containers/move-info-overlay";

describe("FuQuan night weather", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;
  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });
  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override
      .battleStyle("single")
      .startingLevel(50)
      .enemyLevel(100)
      .enemySpecies(SpeciesId.BLISSEY)
      .enemyAbility(AbilityId.BALL_FETCH)
      .enemyMoveset(MoveId.SPLASH)
      .ability(AbilityId.BALL_FETCH)
      .moveset([MoveId.SLASH, MoveId.GUST, MoveId.MOONLIGHT, MoveId.BRIGHT_MOON]);
  });
  it.each([false, true])("keeps each night-weather item at 5 percent of COMMON weight (injured: %s)", async injured => {
    await game.classicMode.startBattle(SpeciesId.PIKACHU, SpeciesId.SQUIRTLE, SpeciesId.CHARMANDER);
    const party = game.scene.getPlayerParty();
    if (injured) {
      for (const pokemon of party) {
        pokemon.hp = 1;
        for (const move of pokemon.getMoveset()) {
          move.ppUsed = move.getMovePp();
        }
      }
    }
    const pool = modifierPool[ModifierTier.COMMON];
    const weights = pool.map(entry => (typeof entry.weight === "function" ? entry.weight(party, 0) : entry.weight));
    const total = weights.reduce((a, b) => a + b, 0);
    for (const id of ["ABILITY_SUN_DEVOURER", "ABILITY_MOON_RADIANCE", "TM_ECLIPSE_SUN", "TM_BRIGHT_MOON"]) {
      const index = pool.findIndex(entry => entry.modifierType.id === id);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(weights[index] / total).toBeCloseTo(0.05, 8);
      expect(Number.isInteger(weights[index])).toBe(true);
    }
  });
  it.each([
    ["TM_ECLIPSE_SUN", MoveId.ECLIPSE_SUN, WeatherType.DARK_SKY],
    ["TM_BRIGHT_MOON", MoveId.BRIGHT_MOON, WeatherType.FULL_MOON],
  ] as const)("learns and uses the dedicated %s TM", async (key, moveId, weather) => {
    game.override.moveset([MoveId.SPLASH]);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const pokemon = game.field.getPlayerPokemon();
    const type = modifierTypes[key]().generateType(game.scene.getPlayerParty()) as TmModifierType;
    expect(type.selectFilter!(pokemon)).toBeNull();
    expect(type.name).toContain(allMoves[moveId].name);
    const item = type.newModifier(pokemon) as TmModifier;
    expect(item).toBeInstanceOf(TmModifier);
    item.apply(pokemon);
    game.move.select(MoveId.SPLASH);
    await game.phaseInterceptor.to("LearnMovePhase");
    expect(pokemon.getMoveset().some(move => move.moveId === moveId)).toBe(true);
    expect(type.selectFilter!(pokemon)).not.toBeNull();
    await game.toNextTurn();
    game.move.select(moveId);
    await game.toNextTurn();
    expect(game.scene.arena.weatherType).toBe(weather);
    expect(pokemon.getCompatibleTms()).not.toContain(MoveId.THUNDER_CRESCENT_SLASH);
    expect(pokemon.getCompatibleTms()).not.toContain(MoveId.MOONLIT_BLOODSTORM);
  });
  it.each([
    ["ABILITY_SUN_DEVOURER", AbilityId.SUN_DEVOURER, WeatherType.DARK_SKY],
    ["ABILITY_MOON_RADIANCE", AbilityId.MOON_RADIANCE, WeatherType.FULL_MOON],
  ] as const)("learns %s and triggers its weather on switch-in", async (key, ability, weather) => {
    game.override.ability(AbilityId.NONE);
    await game.classicMode.startBattle(SpeciesId.PIKACHU, SpeciesId.SQUIRTLE);
    const pokemon = game.scene.getPlayerParty()[1];
    const type = modifierTypes[key]();
    expect(type.selectFilter!(pokemon)).toBeNull();
    const item = type.newModifier(pokemon, 0) as AbilityLearnerModifier;
    expect(item).toBeInstanceOf(AbilityLearnerModifier);
    item.apply(pokemon);
    expect(pokemon.getAllAbilities().some(a => a.id === ability)).toBe(true);
    expect(type.selectFilter!(pokemon)).not.toBeNull();
    game.doSwitchPokemon(1);
    await game.toNextTurn();
    expect(game.scene.arena.weatherType).toBe(weather);
  });
  it("uses exactly five turns of darkness and unlimited full moon", () => {
    const dark = new Weather(WeatherType.DARK_SKY, 5);
    expect([dark.lapse(), dark.lapse(), dark.lapse(), dark.lapse(), dark.lapse()]).toEqual([
      true,
      true,
      true,
      true,
      false,
    ]);
    const moon = new Weather(WeatherType.FULL_MOON, 5);
    expect(moon.turnsLeft).toBe(0);
    expect(moon.lapse()).toBe(true);
    expect(getWeatherStartMessage(WeatherType.DARK_SKY)).toBe("大炎的天黑了！");
    expect(getWeatherStartMessage(WeatherType.FULL_MOON)).toBe("圆月高悬！");
  });
  it("allows mutual legendary weather replacement but rejects ordinary weather", async () => {
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const arena = game.scene.arena;
    for (const old of [WeatherType.HEAVY_RAIN, WeatherType.HARSH_SUN, WeatherType.STRONG_WINDS]) {
      arena.weather = new Weather(old);
      expect(arena.trySetWeather(WeatherType.FULL_MOON)).toBe(true);
      for (const ordinary of [WeatherType.RAIN, WeatherType.SUNNY, WeatherType.SNOW, WeatherType.DARK_SKY]) {
        expect(arena.trySetWeather(ordinary)).toBe(false);
      }
      expect(arena.trySetWeather(old)).toBe(true);
    }
  });
  it("stacks named and type damage bonuses and doubles moon attacks", async () => {
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const user = game.field.getPlayerPokemon();
    game.scene.arena.weather = new Weather(WeatherType.DARK_SKY, 5);
    expect(getWeatherMultiplierForMove(user, allMoves[MoveId.SHADOW_BALL])).toBeCloseTo(1.44);
    expect(getWeatherMultiplierForMove(user, allMoves[MoveId.DARK_PULSE])).toBe(1.2);
    expect(getWeatherMultiplierForMove(user, allMoves[MoveId.TACKLE])).toBe(1);
    game.scene.arena.weather = new Weather(WeatherType.FULL_MOON);
    expect(getWeatherMultiplierForMove(user, allMoves[MoveId.BLOOD_MOON])).toBe(2);
  });
  it("applies a temporary accuracy stage and respects typing and Keen Eye", async () => {
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const user = game.field.getPlayerPokemon();
    const enemy = game.field.getEnemyPokemon();
    game.scene.arena.weather = new Weather(WeatherType.DARK_SKY, 5);
    expect(user.getAccuracyMultiplier(enemy, allMoves[MoveId.TACKLE])).toBeCloseTo(0.75);
    expect(user.getStatStage(Stat.ACC)).toBe(0);
    game.override.ability(AbilityId.KEEN_EYE);
    expect(user.getAccuracyMultiplier(enemy, allMoves[MoveId.TACKLE])).toBe(1);
    game.override.ability(AbilityId.BALL_FETCH);
    user.summonData.types = [PokemonType.BUG];
    expect(user.getAccuracyMultiplier(enemy, allMoves[MoveId.TACKLE])).toBe(1);
  });
  it("guarantees hypnosis accuracy and doubles only sleep effects", async () => {
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const user = game.field.getPlayerPokemon();
    const enemy = game.field.getEnemyPokemon();
    game.scene.arena.weather = new Weather(WeatherType.DARK_SKY, 5);
    expect(allMoves[MoveId.HYPNOSIS].calculateBattleAccuracy(user, enemy)).toBe(-1);
    const song = allMoves[MoveId.RELIC_SONG];
    expect(song.getAttrs("StatusEffectAttr")[0].getMoveChance(user, enemy, song)).toBe(20);
    const thunder = allMoves[MoveId.THUNDERBOLT];
    expect(thunder.getAttrs("StatusEffectAttr")[0].getMoveChance(user, enemy, thunder)).toBe(thunder.chance);
  });
  it("resolves preview moves without changing learned moves; sunlight blocking wins over slicing", async () => {
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const user = game.field.getPlayerPokemon();
    game.scene.arena.weather = new Weather(WeatherType.FULL_MOON);
    expect(getWeatherMove(user, allMoves[MoveId.SLASH]).id).toBe(MoveId.THUNDER_CRESCENT_SLASH);
    expect(getWeatherMove(user, allMoves[MoveId.AIR_CUTTER]).id).toBe(MoveId.THUNDER_CRESCENT_SLASH);
    expect(getWeatherMove(user, allMoves[MoveId.TAILWIND]).id).toBe(MoveId.MOONLIT_BLOODSTORM);
    expect(getWeatherMove(user, allMoves[MoveId.SOLAR_BLADE]).category).toBe(allMoves[MoveId.SPLASH].category);
    expect(user.getMoveset()[0].moveId).toBe(MoveId.SLASH);
    game.scene.arena.weather = null;
    expect(getWeatherMove(user, allMoves[MoveId.SLASH])).toBe(allMoves[MoveId.SLASH]);
  });
  it("darkened Moonlight spends PP but does not heal", async () => {
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const user = game.field.getPlayerPokemon();
    user.hp = 10;
    game.scene.arena.weather = new Weather(WeatherType.DARK_SKY, 5);
    game.move.select(MoveId.MOONLIGHT);
    await game.toNextTurn();
    expect(user.hp).toBe(10);
    expect(user.getMoveset().find(m => m.moveId === MoveId.MOONLIGHT)!.ppUsed).toBe(1);
  });
  it("full-moon Lunar Dance heals and cures the user instead of sacrificing it", async () => {
    game.override.moveset([MoveId.LUNAR_DANCE]);
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const user = game.field.getPlayerPokemon();
    user.hp = 10;
    user.trySetStatus(StatusEffect.POISON);
    game.scene.arena.weather = new Weather(WeatherType.FULL_MOON);
    game.move.select(MoveId.LUNAR_DANCE);
    await game.toNextTurn();
    expect(user.hp).toBe(user.getMaxHp());
    expect(user.status?.effect).toBeUndefined();
  });
  it("full-moon Lunar Dance immediately restores the whole party, including fainted reserves and PP", async () => {
    game.override.moveset([MoveId.LUNAR_DANCE, MoveId.SPLASH]);
    await game.classicMode.startBattle(SpeciesId.PIKACHU, SpeciesId.SQUIRTLE, SpeciesId.CHARMANDER);
    const party = game.scene.getPlayerParty();
    for (const pokemon of party) {
      pokemon.hp = 1;
      pokemon.status = new Status(StatusEffect.POISON);
      for (const move of pokemon.getMoveset()) {
        move.ppUsed = 1;
      }
    }
    party[2].hp = 0;
    party[2].status = new Status(StatusEffect.FAINT);
    const enemy = game.field.getEnemyPokemon();
    enemy.hp = 100;
    game.scene.arena.weather = new Weather(WeatherType.FULL_MOON);
    game.move.select(MoveId.LUNAR_DANCE);
    await game.toNextTurn();
    for (const pokemon of party) {
      expect(pokemon.hp).toBe(pokemon.getMaxHp());
      expect(pokemon.status?.effect).toBeUndefined();
      expect(pokemon.getMoveset().every(move => move.ppUsed === 0)).toBe(true);
    }
    expect(enemy.hp).toBe(100);
    expect(game.scene.arena.getTag(ArenaTagType.PENDING_HEAL)).toBeUndefined();
    expect(getWeatherMove(party[0], allMoves[MoveId.LUNAR_DANCE]).effect).toContain("所有宝可梦");
  });
  it("converts wind attacks against both enemies, pays HP once and ends moonlight", async () => {
    game.override.battleStyle("double").enemySpecies(SpeciesId.SHUCKLE);
    await game.classicMode.startBattle(SpeciesId.PIKACHU, SpeciesId.PIKACHU);
    const [user] = game.scene.getPlayerField();
    const enemies = game.scene.getEnemyField();
    vi.spyOn(user, "getMaxHp").mockReturnValue(100);
    user.hp = 100;
    const damageSpies = enemies.map(enemy => vi.spyOn(enemy, "damageAndUpdate"));
    game.scene.arena.weather = new Weather(WeatherType.FULL_MOON);
    game.move.select(MoveId.GUST, 0);
    game.move.use(MoveId.SPLASH, 1);
    await game.toNextTurn();
    for (const spy of damageSpies) {
      expect(spy).toHaveBeenCalled();
    }
    expect(user.hp).toBe(50);
    expect(game.scene.arena.weatherType).toBe(WeatherType.NONE);
    expect(user.getMoveset().find(m => m.moveId === MoveId.GUST)!.ppUsed).toBe(1);
  });
  it.each([
    [AbilityId.SUN_DEVOURER, WeatherType.DARK_SKY, 5],
    [AbilityId.MOON_RADIANCE, WeatherType.FULL_MOON, 0],
  ])("summoning ability %s starts its weather", async (ability, weather, turns) => {
    game.override.ability(ability);
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    expect(game.scene.arena.weatherType).toBe(weather);
    expect(game.scene.arena.weather?.turnsLeft).toBe(turns);
  });
  it.each([
    [MoveId.ECLIPSE_SUN, WeatherType.DARK_SKY],
    [MoveId.BRIGHT_MOON, WeatherType.FULL_MOON],
  ])("weather move %s works in battle", async (move, weather) => {
    game.override.moveset([move]);
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    game.move.select(move);
    await game.toNextTurn();
    expect(game.scene.arena.weatherType).toBe(weather);
  });
  it("Lunar Blessing fully heals both allies under the full moon", async () => {
    game.override.battleStyle("double").moveset([MoveId.LUNAR_BLESSING, MoveId.SPLASH]);
    await game.classicMode.startBattle(SpeciesId.PIKACHU, SpeciesId.PIKACHU);
    const allies = game.scene.getPlayerField();
    for (const ally of allies) {
      ally.hp = 1;
    }
    game.scene.arena.weather = new Weather(WeatherType.FULL_MOON);
    game.move.select(MoveId.LUNAR_BLESSING, 0);
    game.move.select(MoveId.SPLASH, 1);
    await game.toNextTurn();
    for (const ally of allies) {
      expect(ally.hp).toBe(ally.getMaxHp());
    }
  });
  it("weather suppression removes darkness modifiers and moon transformations", async () => {
    game.override.enemyAbility(AbilityId.AIR_LOCK);
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const user = game.field.getPlayerPokemon();
    const enemy = game.field.getEnemyPokemon();
    game.scene.arena.weather = new Weather(WeatherType.DARK_SKY, 5);
    expect(user.getAccuracyMultiplier(enemy, allMoves[MoveId.TACKLE])).toBe(1);
    expect(getWeatherMultiplierForMove(user, allMoves[MoveId.SHADOW_BALL])).toBe(1);
    game.scene.arena.weather = new Weather(WeatherType.FULL_MOON);
    expect(getWeatherMove(user, allMoves[MoveId.SLASH])).toBe(allMoves[MoveId.SLASH]);
  });
  it("guaranteed sleep moves still respect Insomnia", async () => {
    game.override.enemyAbility(AbilityId.INSOMNIA).moveset([MoveId.HYPNOSIS]);
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    game.scene.arena.weather = new Weather(WeatherType.DARK_SKY, 5);
    game.move.select(MoveId.HYPNOSIS);
    await game.toNextTurn();
    expect(game.field.getEnemyPokemon().status?.effect).not.toBe(StatusEffect.SLEEP);
  });
  it("a transformed slash heals, spends original PP and leaves moonlight active", async () => {
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    const user = game.field.getPlayerPokemon();
    user.hp = 1;
    game.scene.arena.weather = new Weather(WeatherType.FULL_MOON);
    game.move.select(MoveId.SLASH);
    await game.toNextTurn();
    expect(user.hp).toBeGreaterThan(1);
    expect(user.getMoveset()[0].moveId).toBe(MoveId.SLASH);
    expect(user.getMoveset()[0].ppUsed).toBe(1);
    expect(game.scene.arena.weatherType).toBe(WeatherType.FULL_MOON);
  });

  it("shows the transformed name, power and description in the battle menu", async () => {
    const overlay = vi.spyOn(MoveInfoOverlay.prototype, "show");
    await game.classicMode.startBattle(SpeciesId.PIKACHU);
    game.scene.arena.weather = new Weather(WeatherType.FULL_MOON);
    game.onNextPrompt("CommandPhase", UiMode.COMMAND, () => {
      game.scene.ui.getHandler().processInput(Button.ACTION);
    });
    game.onNextPrompt("CommandPhase", UiMode.FIGHT, () => {
      const container = game.scene.ui.getByName<Phaser.GameObjects.Container>(FightUiHandler.MOVES_CONTAINER_NAME);
      expect(container.getAll<Phaser.GameObjects.Text>().some(text => text.text === "雷霆半月斩")).toBe(true);
      expect(overlay).toHaveBeenCalledWith(
        expect.objectContaining({
          id: MoveId.THUNDER_CRESCENT_SLASH,
          power: 150,
          accuracy: 100,
          effect: expect.stringContaining("50%"),
        }),
      );
      game.scene.ui.getHandler().processInput(Button.ACTION);
    });
    await game.phaseInterceptor.to("CommandPhase");
  });
});
