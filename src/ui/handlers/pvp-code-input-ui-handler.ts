import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import { PokemonData } from "#system/pokemon-data";
import type { RunEntry } from "#types/save-data";
import { addTextObject } from "#ui/text";
import { UiHandler } from "#ui/ui-handler";
import { addWindow } from "#ui/ui-theme";
import i18next from "i18next";

export class PvPCodeInputUiHandler extends UiHandler {
  private playerRunEntry: RunEntry;
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

    // First arg is the player's selected run entry (RunEntry type)
    this.playerRunEntry = args[0] as RunEntry;

    if (!this.playerRunEntry) {
      console.error("No player run entry provided to PvPCodeInputUiHandler");
      globalScene.ui.revertMode();
      return false;
    }

    // Convert player's party JSON objects to PokemonData instances
    if (this.playerRunEntry.entry.party) {
      this.playerRunEntry.entry.party = this.playerRunEntry.entry.party.map((p: any) => new PokemonData(p));
      console.log("[PvP] Player party converted to PokemonData instances");
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

    console.log("[PvP] Confirming input, code length:", code.length);

    if (!code) {
      this.showError(i18next.t("pvp:codeEmpty"));
      return;
    }

    try {
      // Decode base64
      const jsonStr = decodeURIComponent(escape(atob(code)));
      const importData = JSON.parse(jsonStr);

      console.log("[PvP] Decoded data:", importData);

      // Validate structure
      if (!importData.runEntry || !importData.trainerId) {
        console.error("[PvP] Invalid structure:", importData);
        this.showError(i18next.t("pvp:codeInvalid"));
        return;
      }

      // Convert to RunEntry format
      const opponentRunEntry: RunEntry = importData.runEntry;
      const opponentName = importData.playerName || importData.trainerId.toString();

      // Convert party JSON objects to PokemonData instances
      if (opponentRunEntry.entry.party) {
        opponentRunEntry.entry.party = opponentRunEntry.entry.party.map((p: any) => new PokemonData(p));
      }

      console.log("[PvP] Starting battle against:", opponentName);
      console.log("[PvP] Opponent party converted to PokemonData instances");

      // Start PvP battle
      this.startBattle(opponentRunEntry, opponentName);
    } catch (error) {
      console.error("[PvP] Failed to decode base64:", error);
      this.showError(i18next.t("pvp:codeInvalid"));
    }
  }

  private showError(message: string): void {
    this.errorText.setText(message);
    this.errorText.setVisible(true);
  }

  private startBattle(opponentRun: RunEntry, opponentName: string): void {
    console.log("[PvP] startBattle called");
    console.log("[PvP] Player run entry:", this.playerRunEntry);
    console.log("[PvP] Opponent run:", opponentRun);
    console.log("[PvP] Opponent name:", opponentName);

    // Store battle data for TitlePhase to pick up
    // playerRunEntry is already a RunEntry, no need to wrap it again
    (globalScene as any).pvpBattleData = {
      playerRun: this.playerRunEntry,
      opponentRun,
      opponentName,
      playerRunData: this.playerRunEntry.entry, // Pass SessionSaveData for return navigation
    };

    console.log("[PvP] Battle data stored, ending current phase to start battle...");

    // Clear UI
    globalScene.ui.setMode(UiMode.MESSAGE);
    globalScene.ui.clearText();

    // Get the current phase (should be TitlePhase) and end it
    // This will trigger TitlePhase.end() which checks for pvpBattleData
    const currentPhase = globalScene.phaseManager.getCurrentPhase();
    console.log("[PvP] Current phase:", currentPhase.phaseName);
    currentPhase.end();

    console.log("[PvP] Phase ended, battle should start");
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
