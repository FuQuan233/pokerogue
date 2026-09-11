import type { UploadedRun } from "#types/pvp-data";
import type { RunEntry } from "#types/save-data";

/**
 * PvP API interface for run sharing
 * Note: This is a placeholder interface. Actual implementation requires backend API
 */
export class PvPAPI {
  /**
   * Upload a victory run to the server
   * @param runEntry The run entry to upload
   * @param playerName The player's username
   * @param trainerId The player's trainer ID
   * @returns Promise resolving to true if successful
   */
  static async uploadRun(runEntry: RunEntry, playerName: string, trainerId: number): Promise<boolean> {
    try {
      // TODO: Implement actual API call when backend is ready
      // const response = await fetch('/api/pvp/upload-run', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ runEntry, playerName, trainerId })
      // });
      // return response.ok;

      // Temporary: Store in localStorage for testing
      const localRuns = PvPAPI.getLocalStorageRuns();
      const uploadedRun: UploadedRun = {
        id: `${trainerId}-${Date.now()}`,
        playerName,
        trainerId,
        runEntry,
        uploadedAt: Date.now(),
      };
      localRuns.push(uploadedRun);
      localStorage.setItem("pvp_uploaded_runs", JSON.stringify(localRuns));
      console.log("Run uploaded (localStorage):", uploadedRun);
      return true;
    } catch (error) {
      console.error("Failed to upload run:", error);
      return false;
    }
  }

  /**
   * Get a list of opponent runs from the server
   * @param limit Maximum number of runs to fetch
   * @param excludeTrainerId Exclude runs from this trainer ID (don't show own runs)
   * @returns Promise resolving to array of uploaded runs
   */
  static async getOpponentRuns(limit = 20, excludeTrainerId?: number): Promise<UploadedRun[]> {
    try {
      // TODO: Implement actual API call when backend is ready
      // const response = await fetch(`/api/pvp/get-runs?limit=${limit}&exclude=${excludeTrainerId}`);
      // return await response.json();

      // Temporary: Get from localStorage for testing
      const allRuns = PvPAPI.getLocalStorageRuns();
      let filteredRuns = allRuns;

      if (excludeTrainerId !== undefined) {
        filteredRuns = allRuns.filter(r => r.trainerId !== excludeTrainerId);
      }

      // Return most recent runs up to limit
      return filteredRuns.sort((a, b) => b.uploadedAt - a.uploadedAt).slice(0, limit);
    } catch (error) {
      console.error("Failed to fetch opponent runs:", error);
      return [];
    }
  }

  /**
   * Helper to get runs from localStorage (temporary implementation)
   */
  private static getLocalStorageRuns(): UploadedRun[] {
    try {
      const data = localStorage.getItem("pvp_uploaded_runs");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get list of players who have uploaded victory runs
   * @param excludeTrainerId Exclude this trainer ID from the list
   * @returns Promise resolving to array of player info
   */
  static async getPlayerList(
    excludeTrainerId?: number,
  ): Promise<Array<{ playerName: string; trainerId: number; victoryCount: number }>> {
    try {
      // TODO: Implement actual API call when backend is ready

      // Temporary: Get from localStorage
      const allRuns = PvPAPI.getLocalStorageRuns();

      // Group by trainerId
      const playerMap = new Map<number, { playerName: string; trainerId: number; victoryCount: number }>();

      allRuns.forEach(run => {
        if (excludeTrainerId !== undefined && run.trainerId === excludeTrainerId) {
          return; // Skip own runs
        }

        if (playerMap.has(run.trainerId)) {
          playerMap.get(run.trainerId)!.victoryCount++;
        } else {
          playerMap.set(run.trainerId, {
            playerName: run.playerName,
            trainerId: run.trainerId,
            victoryCount: 1,
          });
        }
      });

      return Array.from(playerMap.values()).sort((a, b) => b.victoryCount - a.victoryCount);
    } catch (error) {
      console.error("Failed to fetch player list:", error);
      return [];
    }
  }

  /**
   * Check if a run has already been uploaded
   * @param runEntry The run entry to check
   * @param trainerId The player's trainer ID
   * @returns Promise resolving to true if already uploaded
   */
  static async isRunUploaded(runEntry: RunEntry, trainerId: number): Promise<boolean> {
    try {
      // TODO: Implement actual API call when backend is ready

      // Temporary: Check in localStorage
      const allRuns = PvPAPI.getLocalStorageRuns();

      // Check if a run with same timestamp and trainerId exists
      const exists = allRuns.some(
        r => r.trainerId === trainerId && r.runEntry.entry.timestamp === runEntry.entry.timestamp,
      );

      return exists;
    } catch (error) {
      console.error("Failed to check if run is uploaded:", error);
      return false;
    }
  }

  /**
   * Clear all uploaded runs (for testing)
   */
  static clearLocalRuns(): void {
    localStorage.removeItem("pvp_uploaded_runs");
    console.log("Local PvP runs cleared");
  }
}
