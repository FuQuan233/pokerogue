import { PvPAPI, type UploadedTeam } from "#api/pvp-api";
import { globalScene } from "#app/global-scene";
import { UiMode } from "#enums/ui-mode";
import type { VictoryTeam } from "#types/pvp-data";
import i18next from "i18next";
import {
  AbstractOptionSelectUiHandler,
  type OptionSelectConfig,
  type OptionSelectItem,
} from "./abstract-option-select-ui-handler";

export class PvPOpponentSelectUiHandler extends AbstractOptionSelectUiHandler {
  private playerTeam: VictoryTeam;
  private opponentTeams: UploadedTeam[];

  constructor() {
    super(UiMode.PVP_OPPONENT_SELECT);
    this.opponentTeams = [];
  }

  getWindowWidth(): number {
    return 160;
  }

  show(args: any[]): boolean {
    // First arg should be the player's selected team
    this.playerTeam = args[0] as VictoryTeam;

    if (!this.playerTeam) {
      console.error("No player team provided to PvPOpponentSelectUiHandler");
      globalScene.phaseManager.toTitleScreen();
      return false;
    }

    // Show loading text
    globalScene.ui.showText(i18next.t("pvp:loadingOpponents"), null);

    // Fetch opponent teams from server
    PvPAPI.getOpponentTeams(10, globalScene.gameData.trainerId)
      .then(teams => {
        this.opponentTeams = teams;
        this.displayOpponents();
      })
      .catch(err => {
        console.error("Failed to load opponent teams:", err);
        globalScene.ui.showText(i18next.t("pvp:failedToLoadOpponents"), null, () => {
          globalScene.ui.setMode(UiMode.PVP_TEAM_SELECT);
        });
      });

    return true;
  }

  displayOpponents(): void {
    globalScene.ui.clearText();

    if (this.opponentTeams.length === 0) {
      // No opponents available - offer to upload own team
      globalScene.ui.showText(i18next.t("pvp:noOpponents"), null, () => {
        this.offerUpload();
      });
      return;
    }

    const options: OptionSelectItem[] = [];

    // Add option for each opponent team
    this.opponentTeams.forEach((uploadedTeam, index) => {
      const label = i18next.t("pvp:opponent", {
        player: uploadedTeam.playerName,
        wave: uploadedTeam.team.waveIndex,
      });

      options.push({
        label,
        handler: () => {
          this.selectOpponent(index);
          return true;
        },
      });
    });

    // Add upload team option
    options.push({
      label: i18next.t("pvp:uploadTeam"),
      handler: () => {
        this.uploadTeam();
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
    const opponent = this.opponentTeams[opponentIndex];

    // Start PvP battle
    globalScene.ui.setMode(UiMode.MESSAGE);
    globalScene.ui.clearText();

    // Initialize PvP battle phase
    globalScene.phaseManager.clearPhaseQueue();
    globalScene.phaseManager.unshiftNew("PvPBattlePhase", this.playerTeam, opponent.team, opponent.playerName);
  }

  uploadTeam(): void {
    globalScene.ui.showText(i18next.t("pvp:uploadingTeam"), null);

    const playerName = globalScene.gameData.trainerId.toString(); // Use trainer ID as name for now

    PvPAPI.uploadTeam(this.playerTeam, playerName, globalScene.gameData.trainerId).then(success => {
      if (success) {
        globalScene.ui.showText(i18next.t("pvp:uploadSuccess"), null, () => {
          // Clear UI and reload opponents list
          globalScene.ui.clearText();

          // Re-fetch opponents from server
          PvPAPI.getOpponentTeams(10, globalScene.gameData.trainerId)
            .then(teams => {
              this.opponentTeams = teams;
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
          label: i18next.t("pvp:uploadTeam"),
          handler: () => {
            this.uploadTeam();
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
    this.opponentTeams = [];
  }
}
