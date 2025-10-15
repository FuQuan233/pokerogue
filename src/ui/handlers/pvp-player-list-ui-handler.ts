import { PvPAPI } from "#api/pvp-api";
import { globalScene } from "#app/global-scene";
import { UiMode } from "#enums/ui-mode";
import type { SessionSaveData } from "#types/save-data";
import i18next from "i18next";
import {
  AbstractOptionSelectUiHandler,
  type OptionSelectConfig,
  type OptionSelectItem,
} from "./abstract-option-select-ui-handler";

interface PlayerInfo {
  playerName: string;
  trainerId: number;
  victoryCount: number;
}

export class PvPPlayerListUiHandler extends AbstractOptionSelectUiHandler {
  private playerRunData: SessionSaveData;
  private players: PlayerInfo[];

  constructor() {
    super(UiMode.PVP_PLAYER_LIST);
    this.players = [];
  }

  getWindowWidth(): number {
    return 160;
  }

  show(args: any[]): boolean {
    // First arg is the player's selected run data
    this.playerRunData = args[0] as SessionSaveData;

    if (!this.playerRunData) {
      console.error("No player run data provided to PvPPlayerListUiHandler");
      globalScene.ui.revertMode();
      return false;
    }

    // Show loading text
    globalScene.ui.showText(i18next.t("pvp:loadingPlayers"), null);

    // Fetch player list from server
    PvPAPI.getPlayerList(globalScene.gameData.trainerId)
      .then(players => {
        this.players = players;
        this.displayPlayers();
      })
      .catch(err => {
        console.error("Failed to load player list:", err);
        globalScene.ui.showText(i18next.t("pvp:failedToLoadPlayers"), null, () => {
          globalScene.ui.revertMode();
        });
      });

    return true;
  }

  displayPlayers(): void {
    globalScene.ui.clearText();

    if (this.players.length === 0) {
      // No other players found
      globalScene.ui.showText(i18next.t("pvp:noPlayers"), null, () => {
        globalScene.ui.revertMode();
      });
      return;
    }

    const options: OptionSelectItem[] = [];

    // Add option for each player
    this.players.forEach((player, index) => {
      const label = i18next.t("pvp:player", {
        name: player.playerName,
        victories: player.victoryCount,
      });

      options.push({
        label,
        handler: () => {
          this.selectPlayer(index);
          return true;
        },
      });
    });

    // Add cancel button
    options.push({
      label: i18next.t("menu:cancel"),
      handler: () => {
        globalScene.ui.revertMode();
        return true;
      },
    });

    const config: OptionSelectConfig = {
      options,
      maxOptions: 8,
      yOffset: 0,
    };

    super.show([config]);
  }

  selectPlayer(playerIndex: number): void {
    const selectedPlayer = this.players[playerIndex];

    // Open opponent's run history
    globalScene.ui.setMode(
      UiMode.PVP_OPPONENT_RUNS,
      this.playerRunData,
      selectedPlayer.trainerId,
      selectedPlayer.playerName,
    );
  }

  clear() {
    super.clear();
    this.players = [];
  }
}
