import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import { repeatFiveYearPlanMove } from "#data/policy-items";
import type { BattlerIndex } from "#enums/battler-index";
import { BattlerTagLapseType } from "#enums/battler-tag-lapse-type";
import { HitResult } from "#enums/hit-result";
import { MoveId } from "#enums/move-id";
import { WeatherType } from "#enums/weather-type";
import type { Pokemon } from "#field/pokemon";
import { PokemonPhase } from "#phases/pokemon-phase";
import { toDmgValue } from "#utils/common";

export class MoveEndPhase extends PokemonPhase {
  public readonly phaseName = "MoveEndPhase";
  /**
   * Whether the current move was a follow-up attack or not.
   * Used to prevent ticking down Encore and similar effects when copying moves.
   */
  private readonly wasFollowUp: boolean;

  /** Targets from the preceding MovePhase */
  private readonly targets: Pokemon[];
  constructor(
    battlerIndex: BattlerIndex,
    targets: Pokemon[],
    wasFollowUp = false,
    private readonly executedMoveId = MoveId.NONE,
  ) {
    super(battlerIndex);

    this.targets = targets;
    this.wasFollowUp = wasFollowUp;
  }

  start() {
    super.start();

    const pokemon = this.getPokemon();

    if (this.executedMoveId === MoveId.MOONLIT_BLOODSTORM) {
      // Once per use, after every target and hit has resolved. This is a cost, not recoil.
      if (pokemon?.isActive(true)) {
        pokemon.damageAndUpdate(toDmgValue(pokemon.getMaxHp() / 2), {
          result: HitResult.INDIRECT,
          ignoreSegments: true,
        });
      }
      if (globalScene.arena.weatherType === WeatherType.FULL_MOON) {
        globalScene.arena.trySetWeather(WeatherType.NONE, pokemon);
      }
    }

    // Reset hit-related temporary data.
    // TODO: These properties should be stored inside a "move in flight" object,
    // which this Phase would promptly destroy
    if (pokemon) {
      pokemon.turnData.hitsLeft = -1;
    }

    if (!this.wasFollowUp && pokemon?.isActive(true)) {
      pokemon.lapseTags(BattlerTagLapseType.AFTER_MOVE);
    }

    // Remove effects which were set on a Pokemon which removes them on summon (i.e. via Mold Breaker)
    globalScene.arena.setIgnoreAbilities(false);
    for (const target of this.targets) {
      if (target) {
        applyAbAttrs("PostSummonRemoveEffectAbAttr", { pokemon: target });
      }
    }

    if (!this.wasFollowUp && pokemon) {
      repeatFiveYearPlanMove(pokemon, this.executedMoveId, this.targets);
    }

    this.end();
  }
}
