import { SUPPORTED_LANGUAGES } from "#system/supported-languages";
import type { i18n } from "i18next";
import chineseFallbacks from "./fuquan-zh-fallbacks.json";

function fillChineseFallbacks(
  instance: i18n,
  language: string,
  namespace: string,
  resources: Record<string, unknown>,
  prefix = "",
): void {
  for (const [key, value] of Object.entries(resources)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      const current = instance.getResource(language, namespace, path);
      if (!current || current === instance.getResource("en", namespace, path)) {
        instance.addResource(language, namespace, path, value);
      }
    } else if (value && typeof value === "object") {
      fillChineseFallbacks(instance, language, namespace, value as Record<string, unknown>, path);
    }
  }
}

/** Private-server text stays outside the upstream locales submodule. */
export function registerFuquanTranslations(instance: i18n): void {
  // The pinned upstream locale omits hundreds of move effects. Keep a shipped Chinese
  // fallback in the main repo; never depend on an untracked legacy locales directory.
  // Existing upstream translations win, including future translation updates.
  for (const language of ["zh-Hans", "zh-Hant"]) {
    for (const [namespace, resources] of Object.entries(chineseFallbacks)) {
      fillChineseFallbacks(instance, language, namespace, resources);
    }
  }
  for (const language of SUPPORTED_LANGUAGES) {
    instance.addResourceBundle(
      language,
      "move",
      {
        eclipseSun: { name: "蔽日", effect: "将天气变为大黑天，持续5回合。" },
        brightMoon: { name: "明月", effect: "将天气变为月圆之夜，持续时间无限。" },
        thunderCrescentSlash: {
          name: "雷霆半月斩",
          effect: "攻击所有敌方目标，回复实际伤害一半的HP，有50%的概率使目标麻痹。",
        },
        moonlitBloodstorm: {
          name: "月色血风暴",
          effect: "攻击所有敌方目标并使其混乱。使用后消耗自身最大HP的一半，并结束月圆之夜。",
        },
      },
      true,
      true,
    );
    instance.addResourceBundle(
      language,
      "ability",
      {
        sunDevourer: { name: "吞日", description: "出场时将天气变为大黑天，持续5回合。" },
        moonRadiance: { name: "皎月", description: "出场时将天气变为月圆之夜，持续时间无限。" },
      },
      true,
      true,
    );
    instance.addResourceBundle(language, "arenaFlyout", { darkSky: "大黑天", fullMoon: "月圆之夜" }, true, true);

    instance.addResourceBundle(language, "menu", { pvpChallenge: "队伍挑战" }, true, true);
    instance.addResourceBundle(
      language,
      "gameMode",
      {
        randomStats: "随机种族值",
        pvpChallenge: "队伍挑战",
      },
      true,
      true,
    );
    instance.addResourceBundle(
      language,
      "pvp",
      {
        battleStart: "队伍挑战开始！",
        vsPlayer: "对手：{{playerName}}",
        victory: "挑战成功！",
        defeat: "挑战失败！",
        returnToTeamSelect: "返回队伍选择。",
        inputCodeTitle: "导入挑战队伍",
        inputCodeInstruction: "粘贴对手的队伍代码，按回车确认。",
        codeEmpty: "请先输入队伍代码。",
        codeInvalid: "队伍代码无效，请检查是否复制完整。",
        exportHint: "导出通关队伍代码，与其他玩家进行队伍挑战。",
        exportSuccess: "队伍代码已复制。",
        exportFailed: "导出失败。",
        exportCode: "队伍代码：",
      },
      true,
      true,
    );
  }
}
