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
 * Uploaded run entry with player information
 */
export interface UploadedRun {
  /** Unique ID for this uploaded run */
  id: string;
  /** Player's username */
  playerName: string;
  /** Player's trainer ID */
  trainerId: number;
  /** The run entry data */
  runEntry: RunEntry;
  /** Upload timestamp */
  uploadedAt: number;
}
