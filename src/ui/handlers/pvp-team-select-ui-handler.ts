import { globalScene } from "#app/global-scene";
import { UiMode } from "#enums/ui-mode";
import type { VictoryTeam } from "#types/pvp-data";
import i18next from "i18next";
import { addTextObject, TextStyle } from "../text";
import { addWindow } from "../ui-theme";
import {
  AbstractOptionSelectUiHandler,
  type OptionSelectConfig,
  type OptionSelectItem,
} from "./abstract-option-select-ui-handler";

export class PvPTeamSelectUiHandler extends AbstractOptionSelectUiHandler {
  private teams: VictoryTeam[];

  constructor() {
    super(UiMode.PVP_TEAM_SELECT);
    this.teams = [];
  }

  setup() {
    super.setup();

    const ui = this.getUi();

    // Create background window
    this.optionsContainer = this.scene.add.container(0, -48 + this.scene.game.canvas.height / 6 / 2);
    this.optionsContainer.setVisible(false);
    ui.add(this.optionsContainer);

    this.optionsBg = addWindow(
      this.scene,
      0,
      0,
      this.scene.game.canvas.width / 6 - 2,
      this.scene.game.canvas.height / 6 - 2,
    );
    this.optionsBg.setOrigin(0, 0);
    this.optionsContainer.add(this.optionsBg);

    // Title
    const titleText = addTextObject(this.scene, 8, 8, i18next.t("pvp:selectYourTeam"), TextStyle.WINDOW);
    this.optionsContainer.add(titleText);
  }

  show(args: any[]): boolean {
    if (!super.show(args)) {
      return false;
    }

    // Get player's victory teams
    this.teams = globalScene.gameData.getVictoryTeams();

    if (this.teams.length === 0) {
      // Should not happen due to check in title phase, but handle it anyway
      globalScene.ui.setMode(UiMode.MESSAGE);
      globalScene.ui.showText(i18next.t("menu:noPvpTeams"), null, () => {
        globalScene.phaseManager.toTitleScreen();
      });
      return false;
    }

    const options: OptionSelectItem[] = [];

    // Add option for each victory team
    this.teams.forEach((team, index) => {
      const date = new Date(team.timestamp);
      const dateStr = date.toLocaleDateString();

      const label = i18next.t("pvp:team", {
        number: index + 1,
        wave: team.waveIndex,
        date: dateStr,
      });

      // Description for future use (could be displayed on hover or in details)
      // const description = i18next.t("pvp:teamDescription", {
      //   time: timeStr,
      //   playTime: playTimeMin,
      //   pokemon: team.party.length,
      // });

      options.push({
        label,
        handler: () => {
          this.selectTeam(index);
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
      yOffset: 24,
    };

    this.setupOptions(config);
    return true;
  }

  selectTeam(teamIndex: number): void {
    const selectedTeam = this.teams[teamIndex];

    // Proceed to opponent selection with the selected team
    globalScene.ui.setMode(UiMode.PVP_OPPONENT_SELECT, selectedTeam);
  }

  clear() {
    super.clear();
    this.teams = [];
  }
}
