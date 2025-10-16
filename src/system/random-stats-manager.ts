import { globalScene } from "#app/global-scene";
import { GameModes } from "#enums/game-modes";
import type { SpeciesId } from "#enums/species-id";
import { randSeedInt } from "#utils/common";

/**
 * Manages randomized base stats for Pokemon in RANDOM_STATS game mode.
 * Ensures that all Pokemon of the same species have consistent randomized stats throughout a single run.
 */
export class RandomStatsManager {
  /** Maps species+form to their randomized base stats for the current run */
  private randomizedStats: Map<string, number[]> = new Map();

  /**
   * Generates a unique key for a species and form combination
   */
  private getKey(speciesId: SpeciesId, formIndex: number): string {
    return `${speciesId}-${formIndex}`;
  }

  /**
   * Randomizes base stats while maintaining the same total and respecting min/max constraints.
   * @param originalStats - The original base stats array [HP, ATK, DEF, SPATK, SPDEF, SPD]
   * @returns Randomized base stats array with the same total
   */
  private randomizeStats(originalStats: number[]): number[] {
    const MIN_STAT = 5;
    const MAX_STAT = 255;
    const statCount = originalStats.length; // Should be 6
    const total = originalStats.reduce((sum, stat) => sum + stat, 0);

    // Initialize all stats to minimum value
    const randomStats = new Array(statCount).fill(MIN_STAT);
    const remainingPoints = total - MIN_STAT * statCount;

    // Distribute remaining points randomly using a different approach
    // Generate random weights using seeded random
    const weights: number[] = [];
    for (let i = 0; i < statCount; i++) {
      weights.push(randSeedInt(1000) + 1); // Use seeded random, avoid 0
    }
    const weightSum = weights.reduce((sum, w) => sum + w, 0);

    // Calculate target points for each stat based on weights
    const targetPoints: number[] = [];
    let allocatedTotal = 0;

    for (let i = 0; i < statCount - 1; i++) {
      const proportion = weights[i] / weightSum;
      const points = Math.floor(remainingPoints * proportion);
      const maxAdditional = MAX_STAT - MIN_STAT;
      const actualPoints = Math.min(points, maxAdditional);
      targetPoints.push(actualPoints);
      allocatedTotal += actualPoints;
    }

    // Last stat gets exactly what's left to ensure total is correct
    const lastStatPoints = Math.min(remainingPoints - allocatedTotal, MAX_STAT - MIN_STAT);
    targetPoints.push(lastStatPoints);

    // Apply the calculated points
    for (let i = 0; i < statCount; i++) {
      randomStats[i] += targetPoints[i];
    }

    // Verify total is correct
    const actualTotal = randomStats.reduce((sum, stat) => sum + stat, 0);
    if (actualTotal !== total) {
      console.error(`Random stats total mismatch! Expected: ${total}, Got: ${actualTotal}`);
      // Fallback: return original stats if something went wrong
      return originalStats.slice();
    }

    // Shuffle the stats to add more randomness
    for (let i = randomStats.length - 1; i > 0; i--) {
      const j = randSeedInt(i + 1);
      [randomStats[i], randomStats[j]] = [randomStats[j], randomStats[i]];
    }

    return randomStats;
  }

  /**
   * Gets randomized base stats for a Pokemon species.
   * If stats haven't been generated for this species yet, generates and caches them.
   * @param speciesId - The species ID
   * @param formIndex - The form index
   * @param originalStats - The original base stats
   * @returns Randomized base stats (or original if not in RANDOM_STATS mode)
   */
  public getRandomizedStats(speciesId: SpeciesId, formIndex: number, originalStats: number[]): number[] {
    // Only randomize in RANDOM_STATS mode
    if (globalScene.gameMode?.modeId !== GameModes.RANDOM_STATS) {
      return originalStats;
    }

    const key = this.getKey(speciesId, formIndex);

    // Check if we already have randomized stats for this species
    if (!this.randomizedStats.has(key)) {
      // Generate new randomized stats
      const randomized = this.randomizeStats(originalStats);
      this.randomizedStats.set(key, randomized);
    }

    return this.randomizedStats.get(key)!;
  }

  /**
   * Clears all randomized stats (called when starting a new run)
   */
  public clear(): void {
    this.randomizedStats.clear();
  }

  /**
   * Gets the current randomized stats map (for save/load)
   */
  public getStatsMap(): Map<string, number[]> {
    return this.randomizedStats;
  }

  /**
   * Sets the randomized stats map (for save/load)
   */
  public setStatsMap(statsMap: Map<string, number[]>): void {
    this.randomizedStats = new Map(statsMap);
  }

  /**
   * Serializes the stats map to JSON
   */
  public toJSON(): [string, number[]][] {
    return Array.from(this.randomizedStats.entries());
  }

  /**
   * Deserializes the stats map from JSON
   */
  public fromJSON(data: [string, number[]][]): void {
    this.randomizedStats = new Map(data);
  }
}

// Global instance
export const randomStatsManager = new RandomStatsManager();
