import { globalScene } from "#app/global-scene";
import { speciesDataRegistry } from "#app/global-species-data-registry";
import { getPassiveCandyCount } from "#balance/starters";
import { Passive } from "#enums/passive";

/** Shared with the starter selection screen's passive filters. */
export function isPassiveAvailable(speciesId: number, gameData = globalScene.gameData): boolean {
  const starterId = speciesDataRegistry.getStarter(speciesId);
  const starterData = gameData.starterData[starterId];
  return (
    starterData.candyCount >= getPassiveCandyCount(speciesDataRegistry.getStarterCost(starterId))
    && !(starterData.passiveAttr & Passive.UNLOCKED)
  );
}

export function isPassiveUnlocked(passiveAttr: number): boolean {
  return passiveAttr > 0;
}
