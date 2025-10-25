import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import type { BattlerIndex } from "#enums/battler-index";
import { PostSummonPhase } from "#phases/post-summon-phase";

/**
 * Helper to {@linkcode PostSummonPhase} which applies abilities
 */
export class PostSummonActivateAbilityPhase extends PostSummonPhase {
  private readonly priority: number;
  private readonly passive: boolean;

  constructor(battlerIndex: BattlerIndex, priority: number, passive: boolean) {
    super(battlerIndex);
    this.priority = priority;
    this.passive = passive;
  }

  start() {
    // For fusion Pokemon, only trigger all abilities when idx=0 (main ability phase)
    // This prevents duplicate triggering since both main and passive phases would otherwise trigger all 4 abilities
    if (this.getPokemon().isFusion() && !this.passive) {
      // Trigger all 4 abilities (base A main/passive + fusion B main/passive)
      applyAbAttrs("PostSummonAbAttr", { pokemon: this.getPokemon() });
    } else {
      // For regular Pokemon or fusion Pokemon's passive phase, use the specified passive flag
      applyAbAttrs("PostSummonAbAttr", { pokemon: this.getPokemon(), passive: this.passive });
    }

    this.end();
  }

  public override getPriority() {
    return this.priority;
  }
}
