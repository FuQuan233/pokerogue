import { globalScene } from "#app/global-scene";
import { GameModes } from "#enums/game-modes";
import { UiMode } from "#enums/ui-mode";
import type { RunEntry } from "#types/save-data";
import i18next from "i18next";
import {
  AbstractOptionSelectUiHandler,
  type OptionSelectConfig,
  type OptionSelectItem,
} from "./abstract-option-select-ui-handler";

export class PvPTeamSelectUiHandler extends AbstractOptionSelectUiHandler {
  private victoryRuns: RunEntry[];

  constructor() {
    super(UiMode.PVP_TEAM_SELECT);
    this.victoryRuns = [];
  }

  getWindowWidth(): number {
    return 160;
  }

  show(_args: any[]): boolean {
    // Show loading message while fetching
    globalScene.ui.showText(i18next.t("pvp:loadingYourRuns"), null);

    // Get player's victory runs from run history
    globalScene.gameData.getVictoryRuns(3).then(runs => {
      this.victoryRuns = runs;

      if (this.victoryRuns.length === 0) {
        globalScene.ui.showText(i18next.t("menu:noPvpTeams"), null, () => {
          globalScene.phaseManager.toTitleScreen();
        });
        return;
      }

      this.displayRuns();
    });

    return true;
  }

  displayRuns(): void {
    globalScene.ui.clearText();

    const options: OptionSelectItem[] = [];

    // Add option for each victory run
    this.victoryRuns.forEach((run, index) => {
      const data = run.entry;
      const date = new Date(data.timestamp);
      const dateStr = date.toLocaleDateString();

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

      const label = i18next.t("pvp:run", {
        number: index + 1,
        mode: modeName,
        wave: data.waveIndex,
        date: dateStr,
      });

      options.push({
        label,
        handler: () => {
          this.selectRun(index);
          return true;
        },
      });
    });

    // Add cancel button
    options.push({
      label: i18next.t("menu:cancel"),
      handler: () => {
        globalScene.phaseManager.toTitleScreen();
        return true;
      },
    });

    const config: OptionSelectConfig = {
      options,
      maxOptions: 5,
      yOffset: 0,
    };

    super.show([config]);
  }

  selectRun(runIndex: number): void {
    const selectedRun = this.victoryRuns[runIndex];

    // Proceed to opponent selection with the selected run
    globalScene.ui.setMode(UiMode.PVP_OPPONENT_SELECT, selectedRun);
  }

  clear() {
    super.clear();
    this.victoryRuns = [];
  }
}
