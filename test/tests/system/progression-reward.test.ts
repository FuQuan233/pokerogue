import { speciesDataRegistry } from "#app/global-species-data-registry";
import { getPassiveCandyCount } from "#balance/starters";
import { getProgressionReward, isProgressionRewardWave } from "#data/progression-reward";
import { GameModes } from "#enums/game-modes";
import { Passive } from "#enums/passive";
import { SpeciesId } from "#enums/species-id";
import { VoucherType } from "#enums/voucher-type";
import { BattleEndPhase } from "#phases/battle-end-phase";
import { ProgressionRewardPhase } from "#phases/progression-reward-phase";
import { GameData } from "#system/game-data";
import { GameManager } from "#test/framework/game-manager";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Progression vouchers", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;
  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });
  beforeEach(() => {
    game = new GameManager(phaserGame);
    for (const id of speciesDataRegistry.getAllStarters()) {
      game.scene.gameData.dexData[id].caughtAttr = 0n;
      game.scene.gameData.starterData[id].passiveAttr = 0;
      game.scene.gameData.starterData[id].candyCount = 0;
    }
  });
  function unlock(count: number) {
    for (const id of speciesDataRegistry.getAllStarters().slice(0, count)) {
      game.scene.gameData.dexData[id].caughtAttr = 1n;
    }
  }

  it.each([0, 449, 450, 451])("selects the correct tier at %i starters", count => {
    unlock(count);
    expect(getProgressionReward()?.voucherType).toBe(count < 450 ? VoucherType.GOLDEN : VoucherType.PREMIUM);
  });

  it("uses the filter union, including disabled passives and exact candy costs, without double counting", () => {
    unlock(450);
    const starters = speciesDataRegistry.getAllStarters();
    for (const id of starters.slice(0, 199)) {
      game.scene.gameData.starterData[id].passiveAttr = Passive.UNLOCKED;
      game.scene.gameData.starterData[id].candyCount = 999;
    }
    const id = starters[199];
    const entry = game.scene.gameData.starterData[id];
    const cost = getPassiveCandyCount(speciesDataRegistry.getStarterCost(id));
    entry.candyCount = cost - 1;
    expect(getProgressionReward()?.message).toBe("触发了小登福利");
    entry.candyCount = cost;
    expect(getProgressionReward()).toBeNull();
  });

  it("only accepts positive tenth waves outside PvP, including the final wave", () => {
    for (const wave of [10, 20, 200, 5850]) {
      expect(isProgressionRewardWave(wave, GameModes.CLASSIC)).toBe(true);
      expect(isProgressionRewardWave(wave, GameModes.PVP)).toBe(false);
    }
    for (const wave of [-10, 0, 9, 11]) {
      expect(isProgressionRewardWave(wave, GameModes.CLASSIC)).toBe(false);
    }
  });

  it("awards one voucher directly, persists its claim, blocks replay and allows the next milestone", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    game.scene.currentBattle.waveIndex = 10;
    const data = game.scene.gameData;
    const save = vi.spyOn(data, "saveSystem").mockResolvedValue(true);
    const show = vi.spyOn(game.scene.ui, "showText").mockImplementation(() => {});
    const phase = new ProgressionRewardPhase();
    vi.spyOn(phase, "end").mockImplementation(() => {});
    const before = data.voucherCounts[VoucherType.GOLDEN];
    await phase.giveReward();
    expect(data.voucherCounts[VoucherType.GOLDEN]).toBe(before + 1);
    expect(show.mock.calls[0][0]).toBe("触发了新手奖励");
    expect(save).toHaveBeenCalledTimes(1);
    const raw = JSON.stringify(data.getSystemSaveData(), (_key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    );
    const restored = GameData.fromRawSystem(raw);
    expect(restored.progressionRewardClaims).toEqual(data.progressionRewardClaims);
    game.scene.gameData = restored;
    vi.spyOn(restored, "saveSystem").mockResolvedValue(true);
    await phase.giveReward();
    expect(restored.voucherCounts[VoucherType.GOLDEN]).toBe(before + 1);
    game.scene.currentBattle.waveIndex = 20;
    await phase.giveReward();
    expect(restored.voucherCounts[VoucherType.GOLDEN]).toBe(before + 2);
  });

  it("awards a single ten-pull voucher at 450 starters and supports old save data", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    unlock(450);
    game.scene.currentBattle.waveIndex = 10;
    const data = game.scene.gameData;
    vi.spyOn(data, "saveSystem").mockResolvedValue(true);
    const show = vi.spyOn(game.scene.ui, "showText").mockImplementation(() => {});
    const before = data.voucherCounts[VoucherType.PREMIUM];
    await new ProgressionRewardPhase().giveReward();
    expect(data.voucherCounts[VoucherType.PREMIUM]).toBe(before + 1);
    expect(show.mock.calls[0][0]).toBe("触发了小登福利");
    const oldSave = data.getSystemSaveData();
    delete oldSave.progressionRewardClaims;
    const raw = JSON.stringify(oldSave, (_key, value) => (typeof value === "bigint" ? value.toString() : value));
    expect(GameData.fromRawSystem(raw).progressionRewardClaims).toEqual({});
  });

  it("rolls back failed saves without announcing a reward", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    game.scene.currentBattle.waveIndex = 10;
    const data = game.scene.gameData;
    vi.spyOn(data, "saveSystem").mockResolvedValue(false);
    const reset = vi.spyOn(game.scene, "reset").mockImplementation(() => {});
    const show = vi.spyOn(game.scene.ui, "showText").mockImplementation(() => {});
    const before = data.voucherCounts[VoucherType.GOLDEN];
    await new ProgressionRewardPhase().giveReward();
    expect(data.voucherCounts[VoucherType.GOLDEN]).toBe(before);
    expect(data.progressionRewardClaims).toEqual({});
    expect(show).not.toHaveBeenCalled();
    expect(reset).toHaveBeenCalledWith(true);
  });

  it.each([false, true])("queues a milestone reward only on victory: %s", async victory => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    game.scene.currentBattle.waveIndex = 10;
    game.scene.phaseManager.removeAllPhasesOfType("BattleEndPhase");
    const queue = vi.spyOn(game.scene.phaseManager, "unshiftNew");
    const phase = new BattleEndPhase(victory);
    vi.spyOn(phase, "end").mockImplementation(() => {});
    phase.start();
    expect(queue.mock.calls.some(call => call[0] === "ProgressionRewardPhase")).toBe(victory);
  });
});
