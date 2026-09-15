import { globalScene } from "#app/global-scene";
import { allMoves } from "#data/data-lists";
import { getEffectiveWeatherForMove, isMoveDarkened } from "#data/weather";
import { BattlerTagType } from "#enums/battler-tag-type";
import { MoveFlags } from "#enums/move-flags";
import { MoveId } from "#enums/move-id";
import { PokemonType } from "#enums/pokemon-type";
import { WeatherType } from "#enums/weather-type";
import type { Pokemon } from "#field/pokemon";
import { MessageAttr, type Move, MoveEffectAttr, SelfStatusMove } from "#moves/move";
import i18next from "i18next";

/** Full-moon Lunar Dance restores the entire party immediately, including fainted reserves. */
class FullMoonPartyRestoreAttr extends MoveEffectAttr {
  constructor() {
    super(true);
  }

  override apply(user: Pokemon, target: Pokemon, move: Move, args: any[]): boolean {
    if (!super.apply(user, target, move, args)) {
      return false;
    }
    const party = user.isPlayer() ? globalScene.getPlayerParty() : globalScene.getEnemyParty();
    for (const pokemon of party) {
      pokemon.hp = pokemon.getMaxHp();
      pokemon.resetStatus(true, true, false, false);
      pokemon.removeTag(BattlerTagType.INFATUATED);
      for (const learnedMove of pokemon.getMoveset()) {
        learnedMove.ppUsed = 0;
      }
      pokemon.updateInfo();
    }
    globalScene.phaseManager.queueMessage("队伍中所有宝可梦的HP、PP和异常状态全部恢复了！");
    return true;
  }
}

/** Resolve once at execution, or dynamically for previews; never edit learned moves or global definitions. */
export function getWeatherMove(user: Pokemon, original: Move): Move {
  const weather = getEffectiveWeatherForMove(user);
  if (isMoveDarkened(weather, original.id)) {
    const result = new SelfStatusMove(original.id, original.type, -1, original.pp, -1, 0, 9).attr(
      MessageAttr,
      i18next.t("moveTriggers:splash"),
    );
    result.name = original.name;
    result.effect = "当前天气下，此招式不会产生效果。";
    return result;
  }
  if (weather !== WeatherType.FULL_MOON) {
    return original;
  }
  if (original.id === MoveId.LUNAR_DANCE) {
    const result = new SelfStatusMove(original.id, PokemonType.PSYCHIC, -1, original.pp, -1, 0, 9)
      .attr(FullMoonPartyRestoreAttr)
      .danceMove()
      .triageMove();
    result.effect = "使用者不会倒下，立即使队伍中所有宝可梦（包括倒下者）的HP、PP和异常状态全部恢复。";
    return result;
  }
  // Disabled sunlight moves above take precedence; slicing wins for Air Cutter's overlapping flags.
  if (original.hasFlag(MoveFlags.SLICING_MOVE)) {
    return allMoves[MoveId.THUNDER_CRESCENT_SLASH];
  }
  if (original.hasFlag(MoveFlags.WIND_MOVE)) {
    return allMoves[MoveId.MOONLIT_BLOODSTORM];
  }
  if ([MoveId.MOONLIGHT, MoveId.LUNAR_BLESSING, MoveId.MOONBLAST, MoveId.BLOOD_MOON].includes(original.id)) {
    const preview = Object.assign(Object.create(Object.getPrototypeOf(original)), original) as Move;
    preview.effect =
      original.id === MoveId.MOONLIGHT
        ? "回复自身全部HP。"
        : original.id === MoveId.LUNAR_BLESSING
          ? "回复自己和场上队友全部HP，并解除异常状态。"
          : `${original.effect} 月圆之夜下伤害变为2倍。`;
    return preview;
  }
  return original;
}
