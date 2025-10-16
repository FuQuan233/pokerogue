import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import type { RunEntry, SessionSaveData } from "#types/save-data";
import { addTextObject } from "#ui/text";
import { UiHandler } from "#ui/ui-handler";
import { addWindow } from "#ui/ui-theme";
import i18next from "i18next";

export class PvPCodeInputUiHandler extends UiHandler {
  private playerRunData: SessionSaveData;
  private bgWindow: Phaser.GameObjects.NineSlice;
  private titleText: Phaser.GameObjects.Text;
  private instructionText: Phaser.GameObjects.Text;
  private codeInput: Phaser.GameObjects.DOMElement;
  private errorText: Phaser.GameObjects.Text;

  constructor() {
    super(UiMode.PVP_CODE_INPUT);
  }

  override setup(): void {
    const ui = this.getUi();

    // Background window
    this.bgWindow = addWindow(0, 0, 304, 152);
    this.bgWindow.setOrigin(0.5, 0.5);
    this.bgWindow.setPosition(globalScene.scaledCanvas.width / 2, globalScene.scaledCanvas.height / 2);
    this.bgWindow.setVisible(false);
    ui.add(this.bgWindow);

    // Title
    this.titleText = addTextObject(
      globalScene.scaledCanvas.width / 2,
      globalScene.scaledCanvas.height / 2 - 60,
      i18next.t("pvp:inputCodeTitle"),
      TextStyle.WINDOW,
    );
    this.titleText.setOrigin(0.5, 0);
    this.titleText.setVisible(false);
    ui.add(this.titleText);

    // Instruction
    this.instructionText = addTextObject(
      globalScene.scaledCanvas.width / 2,
      globalScene.scaledCanvas.height / 2 - 35,
      i18next.t("pvp:inputCodeInstruction"),
      TextStyle.WINDOW_ALT,
    );
    this.instructionText.setOrigin(0.5, 0);
    this.instructionText.setVisible(false);
    ui.add(this.instructionText);

    // Text input field
    const inputElement = document.createElement("input");
    inputElement.type = "text";
    inputElement.placeholder = "Base64 Code";
    inputElement.style.width = "260px";
    inputElement.style.height = "30px";
    inputElement.style.fontSize = "16px";
    inputElement.style.padding = "5px";
    inputElement.style.border = "2px solid #666";
    inputElement.style.borderRadius = "4px";
    inputElement.style.backgroundColor = "#222";
    inputElement.style.color = "#fff";

    this.codeInput = globalScene.add
      .dom(globalScene.scaledCanvas.width / 2, globalScene.scaledCanvas.height / 2 + 10, inputElement)
      .setOrigin(0.5, 0.5);
    this.codeInput.setVisible(false);
    this.codeInput.addListener("keydown");
    this.codeInput.on("keydown", (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        this.confirmInput();
      } else if (event.key === "Escape") {
        this.cancel();
      }
      event.stopPropagation();
    });

    ui.add(this.codeInput);

    // Error text
    this.errorText = addTextObject(
      globalScene.scaledCanvas.width / 2,
      globalScene.scaledCanvas.height / 2 + 50,
      "",
      TextStyle.WINDOW_ALT,
    );
    this.errorText.setOrigin(0.5, 0);
    this.errorText.setColor("#ff0000");
    this.errorText.setVisible(false);
    ui.add(this.errorText);
  }

  override show(args: any[]): boolean {
    super.show(args);

    // First arg is the player's selected run data
    this.playerRunData = args[0] as SessionSaveData;

    if (!this.playerRunData) {
      console.error("No player run data provided to PvPCodeInputUiHandler");
      globalScene.ui.revertMode();
      return false;
    }

    this.bgWindow.setVisible(true);
    this.titleText.setVisible(true);
    this.instructionText.setVisible(true);
    this.codeInput.setVisible(true);
    this.errorText.setVisible(false);
    this.errorText.setText("");

    // Focus on input
    const inputElement = this.codeInput.node as HTMLInputElement;
    inputElement.value = "";
    setTimeout(() => inputElement.focus(), 100);

    return true;
  }

  override processInput(button: Button): boolean {
    if (button === Button.CANCEL) {
      this.cancel();
      return true;
    }
    if (button === Button.ACTION || button === Button.SUBMIT) {
      this.confirmInput();
      return true;
    }
    return false;
  }

  private confirmInput(): void {
    const inputElement = this.codeInput.node as HTMLInputElement;
    const code = inputElement.value.trim();

    if (!code) {
      this.showError(i18next.t("pvp:codeEmpty"));
      return;
    }

    try {
      // Decode base64
      const jsonStr = decodeURIComponent(escape(atob(code)));
      const importData = JSON.parse(jsonStr);

      // Validate structure
      if (!importData.runEntry || !importData.trainerId) {
        this.showError(i18next.t("pvp:codeInvalid"));
        return;
      }

      // Convert to RunEntry format
      const opponentRunEntry: RunEntry = importData.runEntry;
      const opponentName = importData.playerName || importData.trainerId.toString();

      // Start PvP battle
      this.startBattle(opponentRunEntry, opponentName);
    } catch (error) {
      console.error("Failed to decode base64:", error);
      this.showError(i18next.t("pvp:codeInvalid"));
    }
  }

  private showError(message: string): void {
    this.errorText.setText(message);
    this.errorText.setVisible(true);
  }

  private startBattle(opponentRun: RunEntry, opponentName: string): void {
    // Hide this UI
    this.clear();

    // Start PvP battle
    globalScene.ui.setMode(UiMode.MESSAGE);
    globalScene.ui.clearText();

    // Initialize PvP battle phase
    const playerRunEntry = {
      entry: this.playerRunData,
      isVictory: true,
      isFavorite: false,
    };

    globalScene.phaseManager.clearPhaseQueue();
    // For base64 mode, we don't have opponentTrainerId, so use 0
    globalScene.phaseManager.unshiftNew(
      "PvPBattlePhase",
      playerRunEntry,
      opponentRun,
      opponentName,
      0,
      this.playerRunData,
    );
  }

  private cancel(): void {
    globalScene.ui.revertMode();
  }

  override clear(): void {
    super.clear();
    this.bgWindow.setVisible(false);
    this.titleText.setVisible(false);
    this.instructionText.setVisible(false);
    this.codeInput.setVisible(false);
    this.errorText.setVisible(false);
  }
}
