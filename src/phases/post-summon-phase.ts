import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import type { PhaseString } from "#app/@types/phase-types";
import { globalScene } from "#app/global-scene";
import { EntryHazardTag } from "#data/arena-tag";
import { MysteryEncounterPostSummonTag } from "#data/battler-tags";
import { ArenaTagType } from "#enums/arena-tag-type";
import type { BattlerIndex } from "#enums/battler-index";
import { BattlerTagType } from "#enums/battler-tag-type";
import { HitResult } from "#enums/hit-result";
import { Stat } from "#enums/stat";
import { StatusEffect } from "#enums/status-effect";
import { QuickStrikeScrollModifier } from "#modifiers/modifier";
import { PokemonPhase } from "#phases/pokemon-phase";
import { BooleanHolder } from "#utils/common";

export class PostSummonPhase extends PokemonPhase {
  public readonly phaseName = "PostSummonPhase";
  /** Used to determine whether to push or unshift {@linkcode PostSummonActivateAbilityPhase}s */
  public readonly source: PhaseString;

  constructor(battlerIndex?: BattlerIndex | number, source: PhaseString = "SwitchSummonPhase") {
    super(battlerIndex);
    this.source = source;
  }

  start() {
    super.start();

    const pokemon = this.getPokemon();
    console.log("Ran PSP for:", pokemon.name);
    if (pokemon.status?.effect === StatusEffect.TOXIC) {
      pokemon.status.toxicTurnCount = 0;
    }

    globalScene.arena.applyTags(ArenaTagType.PENDING_HEAL, false, pokemon);

    globalScene.arena.applyTags(EntryHazardTag, false, pokemon);

    // If this is mystery encounter and has post summon phase tag, apply post summon effects
    if (
      globalScene.currentBattle.isBattleMysteryEncounter()
      && pokemon.findTags(t => t instanceof MysteryEncounterPostSummonTag).length > 0
    ) {
      pokemon.lapseTag(BattlerTagType.MYSTERY_ENCOUNTER_POST_SUMMON);
    }
    const field = pokemon.isPlayer() ? globalScene.getPlayerField(true) : globalScene.getEnemyField(true);
    for (const p of field) {
      applyAbAttrs("CommanderAbAttr", { pokemon: p });
    }

    // 瞬击卷轴 - 出场时70%概率立即对敌人进行70威力的攻击
    const quickStrikeTriggered = new BooleanHolder(false);
    globalScene.applyModifiers(QuickStrikeScrollModifier, pokemon.isPlayer(), pokemon, quickStrikeTriggered);
    if (quickStrikeTriggered.value) {
      const enemies = pokemon.isPlayer() ? globalScene.getEnemyField() : globalScene.getPlayerField();
      const validEnemies = enemies.filter(e => e && !e.isFainted() && e.isOnField());
      if (validEnemies.length > 0) {
        // 随机选择一个敌人
        const targetEnemy = validEnemies[Math.floor(Math.random() * validEnemies.length)];
        // 比较物攻和特攻
        const atk = pokemon.getEffectiveStat(Stat.ATK);
        const spatk = pokemon.getEffectiveStat(Stat.SPATK);
        const attackStat = Math.max(atk, spatk);
        // 固定70威力的攻击
        const baseDamage = Math.floor((attackStat * 70) / 50) + 2;
        const quickStrikeDamage = Math.max(1, Math.floor(baseDamage * 0.5)); // 简化伤害计算
        targetEnemy.damageAndUpdate(quickStrikeDamage, { result: HitResult.INDIRECT });
        globalScene.phaseManager.queueMessage("触发了瞬击！");
      }
    }

    this.end();
  }

  public getPriority() {
    return 0;
  }
}
