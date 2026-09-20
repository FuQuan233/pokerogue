import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { UiMode } from "#enums/ui-mode";

export class PvPGameOverPhase extends Phase {
  public readonly phaseName = "PvPGameOverPhase";
  constructor(private readonly isVictory: boolean) {
    super();
  }

  override start(): void {
    super.start();
    globalScene.phaseManager.clearPhaseQueue();
    globalScene.phaseManager.hideAbilityBar();
    globalScene.ui.setMode(UiMode.MESSAGE).then(() => {
      globalScene.ui.showText(
        this.isVictory ? "挑战成功！" : "挑战失败，下次再战！",
        null,
        () => {
          globalScene.gameData.pvpBattleContext = undefined;
          globalScene.reset();
          globalScene.phaseManager.pushNew("TitlePhase");
          this.end();
        },
        null,
        true,
      );
    });
  }
}
