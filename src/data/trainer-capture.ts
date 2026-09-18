import { globalScene } from "#app/global-scene";
import { BattleType } from "#enums/battle-type";
import { TrainerType } from "#enums/trainer-type";
import { RocketTeamBadgeModifier } from "#modifiers/modifier";

/** Only bypasses trainer ownership; ball, double battle and boss restrictions still apply. */
export function canCaptureTrainerPokemon(): boolean {
  const battle = globalScene.currentBattle;
  return (
    battle.battleType === BattleType.TRAINER
    && !!battle.trainer
    && battle.trainer.config.getDerivedType() !== TrainerType.RIVAL
    && !!globalScene.findModifier(m => m instanceof RocketTeamBadgeModifier && m.getStackCount() > 0)
  );
}
