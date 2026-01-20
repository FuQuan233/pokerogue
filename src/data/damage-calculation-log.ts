/**
 * 伤害计算日志 - 用于记录和显示每次攻击的伤害计算过程
 */

import type { MoveId } from "#enums/move-id";
import type { PokemonType } from "#enums/pokemon-type";
import type { SpeciesId } from "#enums/species-id";

/**
 * 单次伤害计算的详细记录
 */
export interface DamageCalculationEntry {
  /** 攻击者名称 */
  attackerName: string;
  /** 攻击者物种ID */
  attackerSpecies: SpeciesId;
  /** 攻击者是否为玩家方 */
  attackerIsPlayer: boolean;
  /** 防御者名称 */
  defenderName: string;
  /** 防御者物种ID */
  defenderSpecies: SpeciesId;
  /** 使用的招式ID */
  moveId: MoveId;
  /** 使用的招式名称 */
  moveName: string;
  /** 招式类型 */
  moveType: PokemonType;
  /** 招式类别：物理/特殊 */
  moveCategory: string;
  /** 是否暴击 */
  isCritical: boolean;
  /** 最终造成的伤害 */
  finalDamage: number;
  /** 计算过程中的各项参数 */
  params: DamageCalculationParams;
  /** 记录时间戳 */
  timestamp: number;
}

/**
 * 伤害计算参数
 */
export interface DamageCalculationParams {
  /** 等级修正 = (2 * level / 5 + 2) */
  levelMultiplier: number;
  /** 攻击者等级 */
  attackerLevel: number;
  /** 招式威力 */
  movePower: number;
  /** 攻击方能力值（攻击/特攻） */
  attackStat: number;
  /** 防御方能力值（防御/特防） */
  defenseStat: number;
  /** 基础伤害 = levelMultiplier * power * atk / def / 50 + 2 */
  baseDamage: number;
  /** 多目标修正（多目标时为0.75） */
  targetMultiplier: number;
  /** 连续技/多重攻击修正 */
  multiStrikeMultiplier: number;
  /** 场地/天气修正 */
  arenaMultiplier: number;
  /** 暴击冲锋修正（受击后伤害翻倍） */
  glaiveRushMultiplier: number;
  /** 暴击修正 */
  criticalMultiplier: number;
  /** 随机数修正 (0.85-1.0) */
  randomMultiplier: number;
  /** 本系加成修正 */
  stabMultiplier: number;
  /** 属性克制修正 */
  typeMultiplier: number;
  /** 灼伤修正（物理技能减半） */
  burnMultiplier: number;
  /** 反射壁/光墙修正 */
  screenMultiplier: number;
  /** 状态克制修正（如地震对挖洞） */
  hitsTagMultiplier: number;
  /** 薄雾场地修正（龙属性减半） */
  mistyTerrainMultiplier: number;
  /** 特性修正（如有色眼镜） */
  abilityDamageMultiplier: number;
  /** 敌方伤害加成/减免修正 */
  enemyModifier: number;
  /** 生命宝珠修正 */
  lifeOrbMultiplier: number;
}

/**
 * 伤害计算日志管理器
 * 存储每个回合的伤害计算记录
 */
export class DamageCalculationLog {
  /** 当前回合的伤害记录 */
  private currentTurnEntries: DamageCalculationEntry[] = [];
  /** 上一回合的伤害记录 */
  private lastTurnEntries: DamageCalculationEntry[] = [];

  /**
   * 添加一条伤害计算记录
   */
  addEntry(entry: DamageCalculationEntry): void {
    this.currentTurnEntries.push(entry);
  }

  /**
   * 回合结束时调用，将当前回合记录移至上一回合
   */
  endTurn(): void {
    this.lastTurnEntries = [...this.currentTurnEntries];
    this.currentTurnEntries = [];
  }

  /**
   * 获取上一回合的伤害记录
   */
  getLastTurnEntries(): DamageCalculationEntry[] {
    return this.lastTurnEntries;
  }

  /**
   * 获取当前回合的伤害记录
   */
  getCurrentTurnEntries(): DamageCalculationEntry[] {
    return this.currentTurnEntries;
  }

  /**
   * 清空所有记录
   */
  clear(): void {
    this.currentTurnEntries = [];
    this.lastTurnEntries = [];
  }

  /**
   * 格式化显示伤害计算过程
   */
  formatEntry(entry: DamageCalculationEntry): string {
    const p = entry.params;
    const lines: string[] = [];

    lines.push(`【${entry.attackerName}】对【${entry.defenderName}】使用【${entry.moveName}】`);
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push(`招式类别: ${entry.moveCategory} | 暴击: ${entry.isCritical ? "是" : "否"}`);
    lines.push("");
    lines.push("▸ 基础参数:");
    lines.push(`  等级修正(levelMult): ${p.levelMultiplier.toFixed(2)} [Lv.${p.attackerLevel}]`);
    lines.push(`  招式威力(power): ${p.movePower}`);
    lines.push(`  攻击能力值(atk): ${p.attackStat}`);
    lines.push(`  防御能力值(def): ${p.defenseStat}`);
    lines.push(`  基础伤害(baseDmg): ${p.baseDamage.toFixed(2)}`);
    lines.push("");
    lines.push("▸ 伤害修正:");

    if (p.targetMultiplier !== 1) {
      lines.push(`  多目标修正(target): ×${p.targetMultiplier.toFixed(2)}`);
    }
    if (p.multiStrikeMultiplier !== 1) {
      lines.push(`  连续技修正(multi): ×${p.multiStrikeMultiplier.toFixed(2)}`);
    }
    if (p.arenaMultiplier !== 1) {
      lines.push(`  场地/天气(arena): ×${p.arenaMultiplier.toFixed(2)}`);
    }
    if (p.glaiveRushMultiplier !== 1) {
      lines.push(`  暴击冲锋(glaive): ×${p.glaiveRushMultiplier.toFixed(2)}`);
    }
    if (p.criticalMultiplier !== 1) {
      lines.push(`  暴击修正(crit): ×${p.criticalMultiplier.toFixed(2)}`);
    }
    lines.push(`  随机修正(random): ×${p.randomMultiplier.toFixed(2)}`);
    if (p.stabMultiplier !== 1) {
      lines.push(`  本系加成(STAB): ×${p.stabMultiplier.toFixed(2)}`);
    }
    if (p.typeMultiplier !== 1) {
      lines.push(`  属性克制(type): ×${p.typeMultiplier.toFixed(2)}`);
    }
    if (p.burnMultiplier !== 1) {
      lines.push(`  灼伤减免(burn): ×${p.burnMultiplier.toFixed(2)}`);
    }
    if (p.screenMultiplier !== 1) {
      lines.push(`  屏障减免(screen): ×${p.screenMultiplier.toFixed(2)}`);
    }
    if (p.hitsTagMultiplier !== 1) {
      lines.push(`  状态克制(tag): ×${p.hitsTagMultiplier.toFixed(2)}`);
    }
    if (p.mistyTerrainMultiplier !== 1) {
      lines.push(`  薄雾场地(misty): ×${p.mistyTerrainMultiplier.toFixed(2)}`);
    }
    if (p.abilityDamageMultiplier !== 1) {
      lines.push(`  特性修正(ability): ×${p.abilityDamageMultiplier.toFixed(2)}`);
    }
    if (p.enemyModifier !== 1) {
      lines.push(`  敌方修正(enemy): ×${p.enemyModifier.toFixed(2)}`);
    }
    if (p.lifeOrbMultiplier !== 1) {
      lines.push(`  生命宝珠(lifeOrb): ×${p.lifeOrbMultiplier.toFixed(2)}`);
    }

    lines.push("");
    lines.push(`▸ 最终伤害: ${entry.finalDamage}`);

    return lines.join("\n");
  }

  /**
   * 格式化所有上一回合的伤害记录
   */
  formatLastTurnEntries(): string {
    if (this.lastTurnEntries.length === 0) {
      return "上一回合没有造成伤害的攻击记录。";
    }

    const sections: string[] = [];
    for (let i = 0; i < this.lastTurnEntries.length; i++) {
      const entry = this.lastTurnEntries[i];
      sections.push(`【攻击 ${i + 1}/${this.lastTurnEntries.length}】`);
      sections.push(this.formatEntry(entry));
      if (i < this.lastTurnEntries.length - 1) {
        sections.push("\n════════════════════════════════════\n");
      }
    }

    return sections.join("\n");
  }
}

/** 全局伤害计算日志实例 */
export const damageCalculationLog = new DamageCalculationLog();
