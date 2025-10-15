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
   * Clear all uploaded runs (for testing)
   */
  static clearLocalRuns(): void {
    localStorage.removeItem("pvp_uploaded_runs");
    console.log("Local PvP runs cleared");
  }
}
