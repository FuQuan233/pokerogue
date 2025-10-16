import { PvPAPI } from "#api/pvp-api";
import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";
import { GameModes } from "#enums/game-modes";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import type { UploadedRun } from "#types/pvp-data";
import type { SessionSaveData } from "#types/save-data";
import { MessageUiHandler } from "#ui/message-ui-handler";
import { addTextObject } from "#ui/text";
import { addWindow } from "#ui/ui-theme";
import { fixedInt, formatLargeNumber } from "#utils/common";
import i18next from "i18next";

export class PvPOpponentRunsUiHandler extends MessageUiHandler {
  private readonly maxRows = 3;

  private runSelectContainer: Phaser.GameObjects.Container;
  private runsContainer: Phaser.GameObjects.Container;
  private runs: OpponentRunEntryContainer[];

  private scrollCursor = 0;
  private cursorObj: Phaser.GameObjects.NineSlice | null;
  private runContainerInitialY: number;

  private playerRunData: SessionSaveData;
  private opponentTrainerId: number;
  private opponentName: string;

  constructor() {
    super(UiMode.PVP_OPPONENT_RUNS);
  }

  override setup() {
    const ui = this.getUi();

    this.runSelectContainer = globalScene.add.container(0, 0);
    this.runSelectContainer.setVisible(false);
    ui.add(this.runSelectContainer);

    const loadSessionBg = globalScene.add.rectangle(
      0,
      0,
      globalScene.scaledCanvas.width,
      -globalScene.scaledCanvas.height,
      0x006860,
    );
    loadSessionBg.setOrigin(0, 0);
    this.runSelectContainer.add(loadSessionBg);

    this.runContainerInitialY = -globalScene.scaledCanvas.height + 8;

    this.runsContainer = globalScene.add.container(8, this.runContainerInitialY);
    this.runSelectContainer.add(this.runsContainer);

    this.runs = [];
  }

  override show(args: any[]): boolean {
    super.show(args);

    this.playerRunData = args[0] as SessionSaveData;
    this.opponentTrainerId = args[1] as number;
    this.opponentName = args[2] as string;

    this.getUi().bringToTop(this.runSelectContainer);
    this.runSelectContainer.setVisible(true);

    const messageHandler = globalScene.ui.getMessageHandler();

    // Show loading message
    messageHandler.showText(i18next.t("pvp:loadingOpponentRuns", { player: this.opponentName }), null);

    // Fetch opponent's runs
    PvPAPI.getOpponentRuns(25, undefined).then(uploadedRuns => {
      // Filter for this specific player's runs
      const playerRuns = uploadedRuns.filter(r => r.trainerId === this.opponentTrainerId);

      if (playerRuns.length === 0) {
        messageHandler.showText(i18next.t("pvp:noOpponentRuns"), null, () => {
          globalScene.ui.revertMode();
        });
        return;
      }

      this.populateRuns(playerRuns).then(() => {
        messageHandler.clearText();
        this.setScrollCursor(0);
        this.setCursor(0);

        if (this.runs.length === 0) {
          this.clearCursor();
        }
      });
    });

    return true;
  }

  override processInput(button: Button): boolean {
    const ui = this.getUi();

    let success = false;
    const error = false;

    if ([Button.ACTION, Button.CANCEL].includes(button)) {
      if (button === Button.ACTION) {
        const cursor = this.cursor + this.scrollCursor;
        if (this.runs[cursor]) {
          // Start PvP battle with selected opponent run
          this.startBattle(cursor);
        } else {
          return false;
        }
        success = true;
        return success;
      }
      success = true;
      globalScene.ui.revertMode();
    } else if (this.runs.length > 0) {
      switch (button) {
        case Button.UP:
          if (this.cursor) {
            success = this.setCursor(this.cursor - 1);
          } else if (this.scrollCursor) {
            success = this.setScrollCursor(this.scrollCursor - 1);
          } else if (this.runs.length > 1) {
            success = this.setCursor(Math.min(this.runs.length - 1, this.maxRows - 1));
            success = this.setScrollCursor(Math.max(0, this.runs.length - this.maxRows)) || success;
          }
          break;
        case Button.DOWN:
          if (this.cursor < Math.min(this.maxRows - 1, this.runs.length - this.scrollCursor - 1)) {
            success = this.setCursor(this.cursor + 1);
          } else if (this.scrollCursor < this.runs.length - this.maxRows) {
            success = this.setScrollCursor(this.scrollCursor + 1);
          } else if (this.runs.length > 1) {
            success = this.setCursor(0);
            success = this.setScrollCursor(0) || success;
          }
          break;
      }
    }

    if (success) {
      ui.playSelect();
    } else if (error) {
      ui.playError();
    }
    return success || error;
  }

  private async populateRuns(uploadedRuns: UploadedRun[]) {
    for (let i = 0; i < uploadedRuns.length; i++) {
      const entry = new OpponentRunEntryContainer(uploadedRuns[i], i);
      globalScene.add.existing(entry);
      this.runsContainer.add(entry);
      this.runs.push(entry);
    }
    if (this.cursorObj && uploadedRuns.length > 0) {
      this.runsContainer.bringToTop(this.cursorObj);
    }
  }

  private startBattle(cursor: number): void {
    const selectedRun = this.runs[cursor].uploadedRun;

    // Start PvP battle
    globalScene.ui.setMode(UiMode.MESSAGE);
    globalScene.ui.clearText();

    // Initialize PvP battle phase - convert SessionSaveData back to RunEntry
    const playerRunEntry = {
      entry: this.playerRunData,
      isVictory: true,
      isFavorite: false,
    };

    globalScene.phaseManager.clearPhaseQueue();
    globalScene.phaseManager.unshiftNew("PvPBattlePhase", playerRunEntry, selectedRun.runEntry, this.opponentName);
  }

  override setCursor(cursor: number): boolean {
    const changed = super.setCursor(cursor);

    if (!this.cursorObj) {
      this.cursorObj = globalScene.add.nineslice(0, 0, "select_cursor_highlight_thick", undefined, 296, 46, 6, 6, 6, 6);
      this.cursorObj.setOrigin(0, 0);
      this.runsContainer.add(this.cursorObj);
    }
    this.cursorObj.setPosition(4, 4 + (cursor + this.scrollCursor) * 56);
    return changed;
  }

  private setScrollCursor(scrollCursor: number): boolean {
    const changed = scrollCursor !== this.scrollCursor;

    if (changed) {
      this.scrollCursor = scrollCursor;
      this.setCursor(this.cursor);
      globalScene.tweens.add({
        targets: this.runsContainer,
        y: this.runContainerInitialY - 56 * scrollCursor,
        duration: fixedInt(325),
        ease: "Sine.easeInOut",
      });
    }
    return changed;
  }

  override clear() {
    super.clear();
    this.runSelectContainer.setVisible(false);
    this.setScrollCursor(0);
    this.clearCursor();
    this.clearRuns();
  }

  private clearCursor() {
    if (this.cursorObj) {
      this.cursorObj.destroy();
    }
    this.cursorObj = null;
  }

  private clearRuns() {
    this.runs.splice(0, this.runs.length);
    this.runsContainer.removeAll(true);
  }
}

/**
 * Container to display opponent's run entry
 */
class OpponentRunEntryContainer extends Phaser.GameObjects.Container {
  public uploadedRun: UploadedRun;

  constructor(uploadedRun: UploadedRun, slotId: number) {
    super(globalScene, 0, slotId * 56);
    this.uploadedRun = uploadedRun;
    this.setup();
  }

  private setup() {
    const data = this.uploadedRun.runEntry.entry;

    const slotWindow = addWindow(0, 0, 304, 52);
    this.add(slotWindow);

    // Victory indicator
    const victoryLabel = addTextObject(8, 5, i18next.t("runHistory:victory"), TextStyle.WINDOW);
    this.add(victoryLabel);

    // Game Mode + Wave
    const gameModeLabel = addTextObject(8, 19, "", TextStyle.WINDOW);
    let mode = "";
    switch (data.gameMode) {
      case GameModes.CLASSIC:
        mode = i18next.t("gameMode:classic");
        break;
      case GameModes.CHALLENGE:
        mode = i18next.t("gameMode:challenge");
        break;
      case GameModes.RANDOM_STATS:
        mode = i18next.t("gameMode:randomStats");
        break;
    }
    gameModeLabel.appendText(mode, false);
    gameModeLabel.appendText(" - ", false);
    gameModeLabel.appendText(i18next.t("saveSlotSelectUiHandler:wave") + " " + data.waveIndex, false);
    this.add(gameModeLabel);

    // Timestamp
    const timestampLabel = addTextObject(8, 33, new Date(data.timestamp).toLocaleString(), TextStyle.WINDOW);
    this.add(timestampLabel);

    // Pokemon icons
    const pokemonIconsContainer = globalScene.add.container(140, 17);
    data.party.forEach((p, i) => {
      const iconContainer = globalScene.add.container(26 * i, 0);
      iconContainer.setScale(0.75);
      const pokemon = p.toPokemon();
      const icon = globalScene.addPokemonIcon(pokemon, 0, 0, 0, 0);

      const text = addTextObject(
        32,
        20,
        `${i18next.t("saveSlotSelectUiHandler:lv")}${formatLargeNumber(pokemon.level, 1000)}`,
        TextStyle.PARTY,
        { fontSize: "54px", color: "#f8f8f8" },
      );
      text.setShadow(0, 0, undefined);
      text.setStroke("#424242", 14);
      text.setOrigin(1, 0);

      iconContainer.add(icon);
      iconContainer.add(text);
      pokemonIconsContainer.add(iconContainer);
      pokemon.destroy();
    });

    this.add(pokemonIconsContainer);
  }
}
