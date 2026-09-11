import { audioManager } from "#app/global-audio-manager";
import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { UiMode } from "#enums/ui-mode";
import i18next from "i18next";

export class PvPGameOverPhase extends Phase {
  public readonly phaseName = "PvPGameOverPhase";
  private isVictory: boolean;

  constructor(isVictory: boolean) {
    super();
    this.isVictory = isVictory;
  }

  start(): void {
    super.start();

    // Fade out BGM
    const fadeDuration = this.isVictory ? 5000 : 3000;
    audioManager.fadeOutBgm(fadeDuration, true);

    // Hide active pokemon info
    const activeBattlers = globalScene.getField().filter(p => p?.isActive(true));
    activeBattlers.map(p => p.hideInfo());

    // Fade out UI
    globalScene.ui.fadeOut(fadeDuration).then(() => {
      this.showResult();
    });
  }

  showResult(): void {
    // Reset UI
    const activeBattlers = globalScene.getField().filter(p => p?.isActive(true));
    activeBattlers.map(a => a.setVisible(false));
    globalScene.setFieldScale(1, true);
    globalScene.phaseManager.clearPhaseQueue();
    globalScene.ui.clearText();

    // Fade back in
    globalScene.ui.fadeIn(500).then(() => {
      // Show victory or defeat message
      const messageKey = this.isVictory ? "pvp:victory" : "pvp:defeat";
      const message = i18next.t(messageKey) + "\n" + i18next.t("pvp:returnToTeamSelect");

      globalScene.ui.showText(
        message,
        null,
        () => {
          // Return to team selection
          this.returnToTeamSelect();
        },
        null,
        true,
      );
    });
  }

  returnToTeamSelect(): void {
    // Clear battle state
    const playerParty = globalScene.getPlayerParty();
    for (const p of playerParty) {
      p.destroy();
    }
    playerParty.length = 0;

    const enemyParty = globalScene.getEnemyParty();
    for (const p of enemyParty) {
      p.destroy();
    }
    enemyParty.length = 0;

    // Clear modifiers
    globalScene.clearEnemyModifiers();
    globalScene.clearEnemyHeldItemModifiers();
    // Clear player modifiers manually since there's no clearModifiers method
    const playerModifiers = globalScene.modifiers;
    playerModifiers.length = 0;

    // Reset UI
    globalScene.ui.setMode(UiMode.MESSAGE);
    globalScene.ui.clearText();

    globalScene.phaseManager.clearPhaseQueue();

    // Return to title, then navigate to PvP run history
    globalScene.phaseManager.unshiftNew("TitlePhase");

    // After title phase loads, navigate back to PvP run history
    // This allows player to choose another run or input another code
    setTimeout(() => {
      globalScene.ui.setMode(UiMode.RUN_HISTORY, true); // true = PvP mode
    }, 100);

    // Clear context
    globalScene.gameData.pvpBattleContext = undefined;

    this.end();
  }
}
