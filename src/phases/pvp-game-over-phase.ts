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
    globalScene.fadeOutBgm(fadeDuration, true);

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
    for (const p of globalScene.getPlayerParty()) {
      p.destroy();
    }
    globalScene.party = [];

    for (const p of globalScene.getEnemyParty()) {
      p.destroy();
    }
    globalScene.enemyParty = [];

    // Clear modifiers
    globalScene.clearEnemyModifiers();
    globalScene.clearEnemyHeldItemModifiers();
    globalScene.modifiers = [];
    globalScene.enemyModifiers = [];

    // Reset to title and open PvP team select
    globalScene.ui.setMode(UiMode.MESSAGE);
    globalScene.ui.clearText();

    globalScene.phaseManager.clearPhaseQueue();
    globalScene.phaseManager.unshiftNew("TitlePhase");

    // Note: Player will need to click PvP Challenge again from title screen
    // Could be improved to go directly back to team select

    this.end();
  }
}
