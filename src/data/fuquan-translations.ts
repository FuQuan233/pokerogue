import { SUPPORTED_LANGUAGES } from "#system/supported-languages";
import type { i18n } from "i18next";

/** Private-server text stays outside the upstream locales submodule. */
export function registerFuquanTranslations(instance: i18n): void {
  for (const language of SUPPORTED_LANGUAGES) {
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
