import { chooseTrainerMove, usesTrainerTactics } from "#ai/trainer-tactics";
import { pvpApi } from "#api/pvp-api";
import { getGameMode } from "#app/game-mode";
import { modifierTypes } from "#data/data-lists";
import { hasFiveYearPlan } from "#data/policy-items";
import { decodePvpTeam, encodePvpTeam } from "#data/pvp-team";
import { canCaptureTrainerPokemon } from "#data/trainer-capture";
import { AbilityId } from "#enums/ability-id";
import { AiType } from "#enums/ai-type";
import { BattlerIndex } from "#enums/battler-index";
import { GameModes } from "#enums/game-modes";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { UiMode } from "#enums/ui-mode";
import { FiveYearPlanModifier, PokemonHeldItemModifier, RocketTeamBadgeModifier } from "#modifiers/modifier";
import { GameOverPhase } from "#phases/game-over-phase";
import { PvPBattlePhase, preparePvpBattle } from "#phases/pvp-battle-phase";
import { VictoryPhase } from "#phases/victory-phase";
import { GameData } from "#system/game-data";
import { GameManager } from "#test/framework/game-manager";
import type { RunEntry } from "#types/save-data";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Asynchronous PVP snapshots", () => {
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
      .ability(AbilityId.BALL_FETCH)
      .enemyAbility(AbilityId.BALL_FETCH)
      .moveset([MoveId.TACKLE, MoveId.SPLASH])
      .enemyMoveset(MoveId.SPLASH);
  });

  const snapshot = (): RunEntry =>
    JSON.parse(
      JSON.stringify({
        isVictory: true,
        isFavorite: false,
        entry: game.scene.gameData.getSessionSaveData(),
      }),
    );

  it("round-trips complete records and accepts old codes without requiring a trainer ID", async () => {
    await game.classicMode.startBattle(SpeciesId.SNORLAX);
    const run = snapshot();
    const code = encodePvpTeam(run, "测试训练家");
    expect(decodePvpTeam(code)).toEqual({ runEntry: run, playerName: "测试训练家" });
    const legacy = btoa(JSON.stringify({ playerName: "test", runEntry: run, trainerId: 0 }));
    expect(decodePvpTeam(legacy).runEntry).toEqual(run);
    expect(() => decodePvpTeam(code.slice(0, 100))).toThrow();
    run.isVictory = false;
    expect(() => encodePvpTeam(run, "test")).toThrow();
  });

  it("restores fusion, custom slots, moves and held items on both sides without changing the source", async () => {
    game.override.startingHeldItems([{ name: "LEFTOVERS", count: 2 }]);
    await game.classicMode.startBattle(SpeciesId.CHARIZARD, SpeciesId.VENUSAUR);
    const [main, donor] = game.scene.getPlayerParty();
    await main.fuse(donor);
    main.customPokemonData.ability = AbilityId.HUGE_POWER;
    main.customPokemonData.passive = AbilityId.LEVITATE;
    main.fusionCustomPokemonData!.ability = AbilityId.REGENERATOR;
    main.fusionCustomPokemonData!.passive = AbilityId.FUR_COAT;
    const planType = modifierTypes.FIVE_YEAR_PLAN();
    planType.id = "FIVE_YEAR_PLAN";
    game.scene.addModifier(new FiveYearPlanModifier(planType, main.id));
    main.hp = 0;
    main.getMoveset()[0].ppUsed = 5;
    const run = snapshot();
    const original = JSON.stringify(run);
    game.override.enemySpecies(null).moveset([]).enemyMoveset([]).ability(AbilityId.NONE).enemyAbility(AbilityId.NONE);
    await preparePvpBattle(run, run, "自己");
    const player = game.scene.getPlayerParty()[0];
    const enemy = game.scene.getEnemyParty()[0];
    expect(player.id).not.toBe(enemy.id);
    for (const pokemon of [player, enemy]) {
      expect(pokemon.fusionSpecies?.speciesId).toBe(SpeciesId.VENUSAUR);
      expect(pokemon.getAllAbilities().map(a => a.id)).toEqual([
        AbilityId.HUGE_POWER,
        AbilityId.LEVITATE,
        AbilityId.REGENERATOR,
        AbilityId.FUR_COAT,
      ]);
      expect(pokemon.hp).toBe(pokemon.getMaxHp());
      expect(pokemon.getMoveset().map(m => m.ppUsed)).toEqual([0, 0]);
      expect(hasFiveYearPlan(pokemon)).toBe(true);
      const items = game.scene.findModifiers(
        m => m instanceof PokemonHeldItemModifier && m.pokemonId === pokemon.id,
        pokemon.isPlayer(),
      );
      expect(items.find(m => m.type.id === "LEFTOVERS")?.stackCount).toBe(2);
    }
    expect(enemy.aiType).toBe(AiType.SMART);
    expect(usesTrainerTactics()).toBe(true);
    game.scene.addModifier(new RocketTeamBadgeModifier(modifierTypes.ROCKET_TEAM_BADGE()));
    expect(canCaptureTrainerPokemon()).toBe(false);
    expect(JSON.stringify(run)).toBe(original);
  });

  it("creates a playable fresh encounter and the tactical AI chooses an attack over Splash", async () => {
    await game.classicMode.startBattle(SpeciesId.SNORLAX);
    const run = snapshot();
    game.scene.phaseManager.clearPhaseQueue();
    game.override.enemySpecies(null).moveset([]).enemyMoveset([]);
    const phase = new PvPBattlePhase(run, run, "测试对手");
    await phase.start();
    await game.phaseInterceptor.to("CommandPhase");
    expect(game.scene.getPlayerPokemon()?.isActive(true)).toBe(true);
    const enemy = game.scene.getEnemyPokemon()!;
    expect(enemy.isActive(true)).toBe(true);
    expect(chooseTrainerMove(enemy, enemy.getMoveset())?.move).toBe(MoveId.TACKLE);
    game.move.use(MoveId.TACKLE);
    await game.toNextTurn();
    expect(game.scene.currentBattle.turn).toBeGreaterThan(1);
    enemy.hp = 1;
    game.move.use(MoveId.TACKLE);
    await game.phaseInterceptor.to("PvPGameOverPhase", false);
    expect(game.scene.phaseManager.getCurrentPhase().phaseName).toBe("PvPGameOverPhase");
  });

  it("finishes victories without EXP, rewards or another adventure wave", async () => {
    await game.classicMode.startBattle(SpeciesId.SNORLAX);
    game.scene.gameMode = getGameMode(GameModes.PVP);
    game.scene.getEnemyParty().forEach(p => {
      p.hp = 0;
    });
    const exp = vi.spyOn(game.scene, "applyPartyExp");
    const push = vi.spyOn(game.scene.phaseManager, "pushNew");
    new VictoryPhase(BattlerIndex.ENEMY).start();
    expect(exp).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("PvPGameOverPhase", true);
    expect(push).not.toHaveBeenCalledWith("NewBattlePhase");
  });

  it("finishes defeats in PVP and never saves over an adventure", async () => {
    await game.classicMode.startBattle(SpeciesId.SNORLAX);
    game.scene.gameMode = getGameMode(GameModes.PVP);
    const getData = vi.spyOn(game.scene.gameData, "getSessionSaveData");
    await GameData.prototype.saveAll.call(game.scene.gameData, true, true);
    expect(getData).not.toHaveBeenCalled();
    const push = vi.spyOn(game.scene.phaseManager, "pushNew");
    new GameOverPhase(false).start();
    expect(push).toHaveBeenCalledWith("PvPGameOverPhase", false);
  });

  it("keeps the complete selectable share code when the server and clipboard are unavailable", async () => {
    await game.classicMode.startBattle(SpeciesId.SNORLAX);
    const run = snapshot();
    vi.spyOn(game.scene.gameData, "getRunHistoryData").mockResolvedValue({ [run.entry.timestamp]: run });
    vi.spyOn(pvpApi, "mine").mockRejectedValue(new Error("共享服务器不可用"));
    vi.spyOn(pvpApi, "list").mockResolvedValue([]);
    const handler = game.scene.ui.handlers[UiMode.PVP_CODE_INPUT];
    handler.show([run]);
    await vi.waitFor(() => expect(document.querySelector(".pvp-lobby")?.textContent).toContain("共享服务器不可用"));
    const button = [...document.querySelectorAll<HTMLButtonElement>(".pvp-lobby button")].find(
      b => b.textContent === "生成分享码",
    )!;
    button.click();
    await vi.waitFor(() =>
      expect(document.querySelector<HTMLTextAreaElement>('textarea[aria-label="完整分享码"]')?.value).toMatch(
        /^PVP1\./,
      ),
    );
    const code = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="完整分享码"]')!.value;
    expect(decodePvpTeam(code).runEntry).toEqual(run);
    expect(code.length).toBeGreaterThan(100);
    handler.clear();
    expect((document.querySelector(".pvp-lobby") as HTMLElement).style.display).toBe("none");
  });
});
