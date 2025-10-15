import type { ModifierData } from "#system/modifier-data";
import type { PokemonData } from "#system/pokemon-data";

/**
 * Represents a saved team composition from a classic mode victory
 */
export interface VictoryTeam {
  /** Timestamp when this victory was achieved */
  timestamp: number;
  /** Wave index at which the victory occurred */
  waveIndex: number;
  /** The party composition at victory */
  party: PokemonData[];
  /** Player's modifiers at victory */
  modifiers: ModifierData[];
  /** Total playtime for this run in seconds */
  playTime: number;
}

/**
 * Data for PvP (Player vs Player) mode
 */
export interface PvPData {
  /** Array of recent victory teams (max 3, most recent first) */
  victoryTeams: VictoryTeam[];
  /** Total PvP wins */
  wins: number;
  /** Total PvP losses */
  losses: number;
  /** Current rating/ELO (if implemented) */
  rating?: number;
}

/**
 * Represents a player's team selection for PvP battle
 */
export interface PvPTeamSelection {
  /** Selected victory team index */
  teamIndex: number;
  /** The actual team data */
  team: VictoryTeam;
}

/**
 * PvP battle state data for synchronization
 */
export interface PvPBattleState {
  /** Battle ID for this match */
  battleId: string;
  /** Player 1 user ID */
  player1Id: string;
  /** Player 2 user ID */
  player2Id: string;
  /** Player 1 team */
  player1Team: VictoryTeam;
  /** Player 2 team */
  player2Team: VictoryTeam;
  /** Current turn number */
  currentTurn: number;
  /** Time remaining for current turn (in seconds) */
  turnTimeRemaining: number;
  /** Whether player 1 is ready for next turn */
  player1Ready: boolean;
  /** Whether player 2 is ready for next turn */
  player2Ready: boolean;
  /** Player 1's chosen action */
  player1Action?: any;
  /** Player 2's chosen action */
  player2Action?: any;
  /** Battle status */
  status: "waiting" | "active" | "finished";
  /** Winner ID if battle is finished */
  winnerId?: string;
}
