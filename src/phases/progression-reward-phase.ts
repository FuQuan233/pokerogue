import { audioManager } from "#app/global-audio-manager";
import { globalScene } from "#app/global-scene";
import { getProgressionReward, isProgressionRewardWave } from "#data/progression-reward";
import { BattlePhase } from "#phases/battle-phase";

/** Direct account reward, independent of item choices and first-time trainer vouchers. */
export class ProgressionRewardPhase extends BattlePhase {
  public readonly phaseName = "ProgressionRewardPhase";

  start() {
    super.start();
    void this.giveReward();
  }

  async giveReward(): Promise<void> {
    const { gameData, gameMode, currentBattle, seed } = globalScene;
    const wave = currentBattle.waveIndex;
    const key = `${gameMode.modeId}:${seed}`;
    const previousClaim = gameData.progressionRewardClaims[key];
    if (!isProgressionRewardWave(wave, gameMode.modeId) || (previousClaim ?? 0) >= wave) {
      this.end();
      return;
    }
    const reward = getProgressionReward(gameData);
    if (!reward) {
      this.end();
      return;
    }
    gameData.voucherCounts[reward.voucherType]++;
    gameData.progressionRewardClaims[key] = wave;
    let saved = false;
    try {
      saved = await gameData.saveSystem();
    } catch (error) {
      console.error("Unable to save progression reward", error);
    }
    if (!saved) {
      gameData.voucherCounts[reward.voucherType]--;
      if (previousClaim === undefined) {
        delete gameData.progressionRewardClaims[key];
      } else {
        gameData.progressionRewardClaims[key] = previousClaim;
      }
      globalScene.reset(true);
      return;
    }
    audioManager.playSound("se/item_fanfare");
    globalScene.ui.showText(reward.message, null, () => this.end(), null, true);
  }
}
