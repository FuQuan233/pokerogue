import type { VictoryTeam } from "#types/pvp-data";

/**
 * Uploaded team data with player information
 */
export interface UploadedTeam {
  /** Unique ID for this uploaded team */
  id: string;
  /** Player's username */
  playerName: string;
  /** Player's trainer ID */
  trainerId: number;
  /** The victory team data */
  team: VictoryTeam;
  /** Upload timestamp */
  uploadedAt: number;
}

/**
 * PvP API interface for team sharing
 * Note: This is a placeholder interface. Actual implementation requires backend API
 */
export class PvPAPI {
  /**
   * Upload a victory team to the server
   * @param team The victory team to upload
   * @param playerName The player's username
   * @param trainerId The player's trainer ID
   * @returns Promise resolving to true if successful
   */
  static async uploadTeam(team: VictoryTeam, playerName: string, trainerId: number): Promise<boolean> {
    try {
      // TODO: Implement actual API call when backend is ready
      // const response = await fetch('/api/pvp/upload-team', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ team, playerName, trainerId })
      // });
      // return response.ok;

      // Temporary: Store in localStorage for testing
      const localTeams = PvPAPI.getLocalStorageTeams();
      const uploadedTeam: UploadedTeam = {
        id: `${trainerId}-${Date.now()}`,
        playerName,
        trainerId,
        team,
        uploadedAt: Date.now(),
      };
      localTeams.push(uploadedTeam);
      localStorage.setItem("pvp_uploaded_teams", JSON.stringify(localTeams));
      console.log("Team uploaded (localStorage):", uploadedTeam);
      return true;
    } catch (error) {
      console.error("Failed to upload team:", error);
      return false;
    }
  }

  /**
   * Get a list of opponent teams from the server
   * @param limit Maximum number of teams to fetch
   * @param excludeTrainerId Exclude teams from this trainer ID (don't show own teams)
   * @returns Promise resolving to array of uploaded teams
   */
  static async getOpponentTeams(limit = 20, excludeTrainerId?: number): Promise<UploadedTeam[]> {
    try {
      // TODO: Implement actual API call when backend is ready
      // const response = await fetch(`/api/pvp/get-teams?limit=${limit}&exclude=${excludeTrainerId}`);
      // return await response.json();

      // Temporary: Get from localStorage for testing
      const allTeams = PvPAPI.getLocalStorageTeams();
      let filteredTeams = allTeams;

      if (excludeTrainerId !== undefined) {
        filteredTeams = allTeams.filter(t => t.trainerId !== excludeTrainerId);
      }

      // Return most recent teams up to limit
      return filteredTeams.sort((a, b) => b.uploadedAt - a.uploadedAt).slice(0, limit);
    } catch (error) {
      console.error("Failed to fetch opponent teams:", error);
      return [];
    }
  }

  /**
   * Helper to get teams from localStorage (temporary implementation)
   */
  private static getLocalStorageTeams(): UploadedTeam[] {
    try {
      const data = localStorage.getItem("pvp_uploaded_teams");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear all uploaded teams (for testing)
   */
  static clearLocalTeams(): void {
    localStorage.removeItem("pvp_uploaded_teams");
    console.log("Local PvP teams cleared");
  }
}
