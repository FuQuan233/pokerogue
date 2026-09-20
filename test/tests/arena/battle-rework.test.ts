import { DamageCalculationLog, damageCalculationLog } from "#data/damage-calculation-log";
import { captureDamageTrace, observeDamageChange } from "#data/damage-trace";
import { allMoves, modifierTypes } from "#data/data-lists";
import { AbilityId } from "#enums/ability-id";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { Stat } from "#enums/stat";
import { UiMode } from "#enums/ui-mode";
import { PeoplePowerModifier } from "#modifiers/modifier";
import { PokemonData } from "#system/pokemon-data";
import { GameManager } from "#test/framework/game-manager";
import { type SummaryUiHandler, SummaryUiMode } from "#ui/summary-ui-handler";
import * as uiText from "#ui/text";
import { formatStat, NumberHolder } from "#utils/common";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Battle rework and damage snapshots", () => {
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
      .enemyLevel(50)
      .enemySpecies(SpeciesId.BLISSEY)
      .enemyAbility(AbilityId.BALL_FETCH)
      .ability(AbilityId.BALL_FETCH)
      .moveset([MoveId.DOUBLE_HIT, MoveId.SPLASH])
      .enemyMoveset(MoveId.TACKLE)
      .criticalHits(false);
    damageCalculationLog.clear();
  });

  it("unlocks all four fused slots and preserves the surviving passive only in this run", async () => {
    await game.classicMode.startBattle(SpeciesId.CHARIZARD, SpeciesId.VENUSAUR);
    const [main, donor] = game.scene.getPlayerParty();
    main.passive = false;
    donor.passive = false;
    const progress = JSON.stringify(game.scene.gameData.starterData);
    main.fuse(donor);
    expect(main.passive).toBe(true);
    expect(main.getAllAbilities()).toHaveLength(4);
    const restored = new PokemonData(JSON.parse(JSON.stringify(new PokemonData(main)))).toPokemon();
    expect(restored.hasPassive()).toBe(true);
    expect(restored.getAllAbilities()).toHaveLength(4);
    main.clearFusionSpecies();
    expect(main.passive).toBe(true);
    expect(main.getAllAbilities()).toHaveLength(2);
    expect(JSON.stringify(game.scene.gameData.starterData)).toBe(progress);
  });

  it("records both sides and every hit, with exact live power modifiers and immutable numeric snapshots", async () => {
    game.override.enemySpecies(SpeciesId.PACHIRISU).startingHeldItems([{ name: "LIFE_ORB" }]);
    await game.classicMode.startBattle(SpeciesId.SNORLAX);
    const player = game.field.getPlayerPokemon();
    player.customPokemonData.ability = AbilityId.HUGE_POWER;
    player.summonData.statStages[Stat.ATK - 1] = 2;
    vi.spyOn(allMoves[MoveId.DOUBLE_HIT], "calculateBattleAccuracy").mockReturnValue(-1);
    game.move.use(MoveId.DOUBLE_HIT);
    await game.toNextTurn();
    const entries = damageCalculationLog.getLastTurnEntries();
    expect(entries.length).toBeGreaterThanOrEqual(3);
    expect(entries.filter(entry => entry.moveName === allMoves[MoveId.DOUBLE_HIT].name)).toHaveLength(2);
    expect(entries.some(entry => entry.moveName === allMoves[MoveId.TACKLE].name)).toBe(true);
    const text = damageCalculationLog.formatLastTurnEntries();
    expect(text).toContain("个体值");
    expect(text).toContain("能力等级+2");
    expect(text).toContain("生命宝珠");
    expect(text).toContain("实际扣血");
    player.summonData.statStages[Stat.ATK - 1] = -6;
    player.stats[Stat.ATK] = 1;
    expect(damageCalculationLog.formatLastTurnEntries()).toBe(text);
  });

  it("records fixed damage without inventing attack/defense multipliers", async () => {
    game.override.moveset(MoveId.SEISMIC_TOSS).enemyMoveset(MoveId.SPLASH);
    await game.classicMode.startBattle(SpeciesId.SNORLAX);
    game.move.use(MoveId.SEISMIC_TOSS);
    await game.toNextTurn();
    const [entry] = damageCalculationLog.getLastTurnEntries();
    expect(entry.finalDamage).toBe(50);
    expect(entry.lines.join("\n")).toContain("固定伤害");
  });

  it("observes a mutation exactly once and restores tracing after exceptions", () => {
    const holder = new NumberHolder(100);
    let calls = 0;
    const trace = captureDamageTrace(() =>
      observeDamageChange("道具", [holder], () => {
        calls++;
        holder.value *= 1.3;
      }),
    );
    expect(calls).toBe(1);
    expect(trace.lines.join("\n")).toContain("100 → 130");
    expect(() =>
      captureDamageTrace(() => {
        throw new Error("test");
      }),
    ).toThrow();
    const next = captureDamageTrace(() =>
      observeDamageChange("道具", [holder], () => {
        holder.value = 200;
      }),
    );
    expect(next.lines.join("\n")).not.toContain("100 → 130");
  });

  it("shows current effective stats and People Power base stats in the actual summary panels", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP, SpeciesId.PACHIRISU);
    game.scene.addModifier(new PeoplePowerModifier(modifierTypes.PEOPLE_POWER()));
    const player = game.field.getPlayerPokemon();
    player.setStatStage(Stat.ATK, 2);
    const handler = game.scene.ui.handlers[UiMode.SUMMARY] as SummaryUiHandler;
    // Headless MockText drops constructor content; inspect text passed to the actual UI renderer.
    const rendered = vi.spyOn(uiText, "addTextObject");
    handler.show([player, SummaryUiMode.DEFAULT, 1]);
    const content = rendered.mock.calls.map(call => call[2]);
    expect(content).toContain(formatStat(player.getEffectiveStat(Stat.ATK)));
    expect(content).toContain(formatStat(100));
    expect(player.getEffectiveStat(Stat.ATK)).toBe(player.getStat(Stat.ATK) * 2);
  });

  it("retains an entire latest turn and isolates subsequent rounds", () => {
    const log = new DamageCalculationLog();
    const entry = {
      wave: 10,
      turn: 1,
      attackerName: "甲",
      defenderName: "乙",
      moveName: "攻击",
      finalDamage: 5,
      lines: ["5"],
    };
    log.addEntry(entry);
    log.addEntry(entry);
    log.endTurn();
    expect(log.getLastTurnEntries()).toHaveLength(2);
    log.addEntry({ ...entry, turn: 2 });
    expect(log.getLastTurnEntries()).toHaveLength(1);
    expect(log.getLastTurnEntries()[0].turn).toBe(2);
    log.endTurn();
    log.endTurn();
    expect(log.getLastTurnEntries()).toHaveLength(0);
  });
});
