import { globalScene } from "#app/global-scene";
import { speciesDataRegistry } from "#app/global-species-data-registry";
import { isPassiveAvailable, isPassiveUnlocked } from "#data/starter-progress";
import { GameModes } from "#enums/game-modes";
import { VoucherType } from "#enums/voucher-type";

export function isProgressionRewardWave(wave: number, mode: GameModes): boolean {
  return mode !== GameModes.PVP && wave > 0 && wave % 10 === 0;
}

export function getProgressionReward(gameData = globalScene.gameData) {
  const starters = speciesDataRegistry.getAllStarters();
  const starterCount = starters.filter(id => !!gameData.dexData[id]?.caughtAttr).length;
  if (starterCount < 450) {
    return { voucherType: VoucherType.GOLDEN, message: "触发了新手奖励" };
  }
  // Exactly the union of ON and UNLOCKABLE passive filters; count each starter species once.
  const passiveCount = starters.filter(
    id => isPassiveUnlocked(gameData.starterData[id].passiveAttr) || isPassiveAvailable(id, gameData),
  ).length;
  if (passiveCount < 200) {
    return { voucherType: VoucherType.PREMIUM, message: "触发了小登福利" };
  }
  return null;
}
