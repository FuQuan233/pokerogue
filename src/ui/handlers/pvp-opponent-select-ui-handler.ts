import { PvPAPI } from "#api/pvp-api";
import { globalScene } from "#app/global-scene";
import { GameModes } from "#enums/game-modes";
import { UiMode } from "#enums/ui-mode";
import type { UploadedRun } from "#types/pvp-data";
import type { RunEntry } from "#types/save-data";
import i18next from "i18next";
import {
  AbstractOptionSelectUiHandler,
  type OptionSelectConfig,
  type OptionSelectItem,
} from "./abstract-option-select-ui-handler";

export class PvPOpponentSelectUiHandler extends AbstractOptionSelectUiHandler {
  private playerRun: RunEntry;
  private opponentRuns: UploadedRun[];

  constructor() {
    super(UiMode.PVP_OPPONENT_SELECT);
    this.opponentRuns = [];
  }

  getWindowWidth(): number {
    return 160;
  }

  show(args: any[]): boolean {
    // First arg should be the player's selected run
    this.playerRun = args[0] as RunEntry;

    if (!this.playerRun) {
      console.error("No player run provided to PvPOpponentSelectUiHandler");
      globalScene.phaseManager.toTitleScreen();
      return false;
    }

    // Show loading text
    globalScene.ui.showText(i18next.t("pvp:loadingOpponents"), null);

    // Fetch opponent runs from server
    PvPAPI.getOpponentRuns(10, globalScene.gameData.trainerId)
      .then(runs => {
        this.opponentRuns = runs;
        this.displayOpponents();
      })
      .catch(err => {
        console.error("Failed to load opponent runs:", err);
        globalScene.ui.showText(i18next.t("pvp:failedToLoadOpponents"), null, () => {
          globalScene.ui.setMode(UiMode.PVP_TEAM_SELECT);
        });
      });

    return true;
  }

  displayOpponents(): void {
    globalScene.ui.clearText();

    if (this.opponentRuns.length === 0) {
      // No opponents available - offer to upload own run
      globalScene.ui.showText(i18next.t("pvp:noOpponents"), null, () => {
        this.offerUpload();
      });
      return;
    }

    const options: OptionSelectItem[] = [];

    // Add option for each opponent run
    this.opponentRuns.forEach((uploadedRun, index) => {
      const data = uploadedRun.runEntry.entry;

      // Get mode name
      let modeName = "";
      switch (data.gameMode) {
        case GameModes.CLASSIC:
          modeName = i18next.t("gameMode:classic");
          break;
        case GameModes.CHALLENGE:
          modeName = i18next.t("gameMode:challenge");
          break;
        case GameModes.RANDOM_STATS:
          modeName = i18next.t("gameMode:randomStats");
          break;
      }

      const label = i18next.t("pvp:opponentRun", {
        player: uploadedRun.playerName,
        mode: modeName,
        wave: data.waveIndex,
      });

      options.push({
        label,
        handler: () => {
          this.selectOpponent(index);
          return true;
        },
      });
    });

    // Add upload run option
    options.push({
      label: i18next.t("pvp:uploadRun"),
      handler: () => {
        this.uploadRun();
        return true;
      },
    });

    // Add cancel button
    options.push({
      label: i18next.t("menu:cancel"),
      handler: () => {
        globalScene.ui.setMode(UiMode.PVP_TEAM_SELECT);
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

  selectOpponent(opponentIndex: number): void {
    const opponent = this.opponentRuns[opponentIndex];

    // Start PvP battle
    globalScene.ui.setMode(UiMode.MESSAGE);
    globalScene.ui.clearText();

    // Initialize PvP battle phase
    globalScene.phaseManager.clearPhaseQueue();
    globalScene.phaseManager.unshiftNew("PvPBattlePhase", this.playerRun, opponent.runEntry, opponent.playerName);
  }

  uploadRun(): void {
    globalScene.ui.showText(i18next.t("pvp:uploadingRun"), null);

    const playerName = globalScene.gameData.trainerId.toString(); // Use trainer ID as name for now

    PvPAPI.uploadRun(this.playerRun, playerName, globalScene.gameData.trainerId).then(success => {
      if (success) {
        globalScene.ui.showText(i18next.t("pvp:uploadSuccess"), null, () => {
          // Clear UI and reload opponents list
          globalScene.ui.clearText();

          // Re-fetch opponents from server
          PvPAPI.getOpponentRuns(10, globalScene.gameData.trainerId)
            .then(runs => {
              this.opponentRuns = runs;
              this.displayOpponents();
            })
            .catch(err => {
              console.error("Failed to reload opponents:", err);
              globalScene.ui.setMode(UiMode.PVP_TEAM_SELECT);
            });
        });
      } else {
        globalScene.ui.showText(i18next.t("pvp:uploadFailed"), null, () => {
          this.displayOpponents();
        });
      }
    });
  }

  offerUpload(): void {
    globalScene.ui.showText(i18next.t("pvp:offerUpload"), null, () => {
      const options: OptionSelectItem[] = [
        {
          label: i18next.t("pvp:uploadRun"),
          handler: () => {
            this.uploadRun();
            return true;
          },
        },
        {
          label: i18next.t("menu:cancel"),
          handler: () => {
            globalScene.ui.setMode(UiMode.PVP_TEAM_SELECT);
            return true;
          },
        },
      ];

      globalScene.ui.setOverlayMode(UiMode.OPTION_SELECT, { options });
    });
  }

  clear() {
    super.clear();
    this.opponentRuns = [];
  }
}
