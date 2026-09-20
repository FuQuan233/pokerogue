import { speciesDataRegistry } from "#app/global-species-data-registry";
import { allAbilities, allMoves } from "#data/data-lists";
import { GameModes } from "#enums/game-modes";
import { getModifierTypeFuncById } from "#modifiers/modifier-type";
import type { RunEntry } from "#types/save-data";

export const PVP_MAX_BYTES = 1_000_000;

export function isPvpVictory(run: RunEntry): boolean {
  return run?.isVictory === true && run.entry?.gameMode === GameModes.CLASSIC;
}

/** Keep the complete selected team, including custom abilities, fusion data and item arguments. */
export function validatePvpRun(value: unknown): RunEntry {
  const run = value as RunEntry;
  if (
    !isPvpVictory(run)
    || !Array.isArray(run.entry.party)
    || run.entry.party.length === 0
    || run.entry.party.length > 6
  ) {
    throw new Error("请选择经典模式的通关记录（1 至 6 只宝可梦）。");
  }
  const ids = new Set<number>();
  for (const p of run.entry.party) {
    if (
      !p
      || !Number.isSafeInteger(p.id)
      || ids.has(p.id)
      || !Number.isInteger(p.level)
      || p.level < 1
      || p.level > 100000
    ) {
      throw new Error("队伍的宝可梦编号或等级无效。");
    }
    ids.add(p.id);
    for (const id of [p.species, p.fusionSpecies].filter(Boolean)) {
      if (!speciesDataRegistry.getSpecies(id)) {
        throw new Error("队伍包含当前版本不支持的宝可梦。");
      }
    }
    if (!Array.isArray(p.ivs) || p.ivs.length !== 6 || p.ivs.some(n => !Number.isInteger(n) || n < 0 || n > 31)) {
      throw new Error("队伍的个体值数据无效。");
    }
    if (
      !Array.isArray(p.moveset)
      || p.moveset.length === 0
      || p.moveset.length > 4
      || p.moveset.some(m => !m || !allMoves[m.moveId])
    ) {
      throw new Error("队伍包含无效或不兼容的招式。");
    }
    for (const data of [p.customPokemonData, p.fusionCustomPokemonData]) {
      for (const ability of [data?.ability, data?.passive]) {
        if (ability != null && ability !== -1 && !allAbilities[ability]) {
          throw new Error("队伍包含当前版本不支持的特性。");
        }
      }
    }
  }
  if (!Array.isArray(run.entry.modifiers) || run.entry.modifiers.length > 2000) {
    throw new Error("队伍的道具数据无效。");
  }
  for (const item of run.entry.modifiers) {
    if (
      !item
      || !getModifierTypeFuncById(item.typeId)
      || !Number.isInteger(item.stackCount)
      || item.stackCount < 1
      || !Array.isArray(item.args)
    ) {
      throw new Error(`队伍包含无效或当前版本不支持的道具：${item?.typeId ?? item?.className ?? "未知"}。`);
    }
  }
  return run;
}

export function encodePvpTeam(run: RunEntry, playerName: string): string {
  validatePvpRun(run);
  const bytes = new TextEncoder().encode(
    JSON.stringify({ version: 1, playerName: playerName.trim().slice(0, 20), runEntry: run }),
  );
  if (bytes.length > PVP_MAX_BYTES) {
    throw new Error("队伍记录过大，无法生成分享码。");
  }
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `PVP1.${btoa(binary)}`;
}

export function decodePvpTeam(code: string): { runEntry: RunEntry; playerName: string } {
  const input = code.trim().replace(/\s/g, "");
  if (!input || input.length > Math.ceil((PVP_MAX_BYTES * 4) / 3) + 8) {
    throw new Error("分享码为空或过大。");
  }
  let data: { version?: number; runEntry: unknown; playerName?: string };
  try {
    const binary = atob(input.startsWith("PVP1.") ? input.slice(5) : input);
    data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, c => c.charCodeAt(0))));
  } catch {
    throw new Error("分享码无效，请完整复制后重试。");
  }
  if (data.version != null && data.version !== 1) {
    throw new Error("该分享码版本暂不支持。");
  }
  return { runEntry: validatePvpRun(data.runEntry), playerName: String(data.playerName || "分享队伍").slice(0, 20) };
}
