/** Immutable chronological snapshots of real hits; viewing never recalculates a battle. */
export interface DamageCalculationEntry {
  wave: number;
  turn: number;
  attackerName: string;
  defenderName: string;
  moveName: string;
  finalDamage: number;
  lines: string[];
}

export class DamageCalculationLog {
  private currentTurnEntries: DamageCalculationEntry[] = [];
  private lastTurnEntries: DamageCalculationEntry[] = [];
  private key = "";
  addEntry(entry: DamageCalculationEntry): void {
    const key = `${entry.wave}:${entry.turn}`;
    if (key !== this.key) {
      if (this.currentTurnEntries.length > 0) {
        this.lastTurnEntries = this.currentTurnEntries;
      }
      this.currentTurnEntries = [];
      this.key = key;
    }
    this.currentTurnEntries.push({ ...entry, lines: [...entry.lines] });
  }
  endTurn(): void {
    this.lastTurnEntries = this.currentTurnEntries;
    this.currentTurnEntries = [];
  }
  getLastTurnEntries(): DamageCalculationEntry[] {
    return this.currentTurnEntries.length > 0 ? this.currentTurnEntries : this.lastTurnEntries;
  }
  getCurrentTurnEntries(): DamageCalculationEntry[] {
    return this.currentTurnEntries;
  }
  clear(): void {
    this.currentTurnEntries = [];
    this.lastTurnEntries = [];
    this.key = "";
  }
  formatEntry(entry: DamageCalculationEntry): string {
    return [
      `第${entry.wave}关 第${entry.turn}回合`,
      `${entry.attackerName} → ${entry.defenderName}`,
      entry.moveName,
      ...entry.lines,
      `本次实际扣血：${entry.finalDamage}`,
    ].join("\n");
  }
  formatLastTurnEntries(): string {
    const entries = this.getLastTurnEntries();
    if (entries.length === 0) {
      return "最近回合没有攻击伤害记录。";
    }
    return entries
      .map((entry, index) => `【第${index + 1}/${entries.length}次命中】\n${this.formatEntry(entry)}`)
      .join("\n\n");
  }
}
export const damageCalculationLog = new DamageCalculationLog();
