import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { damageCalculationLog } from "#data/damage-calculation-log";
import { getTypeRgb } from "#data/type";
import { Button } from "#enums/buttons";
import { Command } from "#enums/command";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesId } from "#enums/species-id";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import { TerastallizeAccessModifier } from "#modifiers/modifier";
import type { CommandPhase } from "#phases/command-phase";
import { PartyUiHandler, PartyUiMode } from "#ui/party-ui-handler";
import { addTextObject } from "#ui/text";
import { UiHandler } from "#ui/ui-handler";
import i18next from "i18next";

// 伤害日志显示配置
const DAMAGE_LOG_CONFIG = {
  PADDING: 6,
  VISIBLE_LINES: 14, // 一屏可见行数
  SCROLL_STEP: 1, // 每次滚动行数
};

export class CommandUiHandler extends UiHandler {
  private commandsContainer: Phaser.GameObjects.Container;
  private cursorObj: Phaser.GameObjects.Image | null;

  private teraButton: Phaser.GameObjects.Sprite;
  private damageLogButton: Phaser.GameObjects.Container | null = null;
  private showingDamageLog = false;
  private damageLogCurrentIndex = 0;
  private damageLogScrollOffset = 0;
  private damageLogLines: string[] = [];

  // 伤害日志全屏覆盖层
  private damageLogOverlay: Phaser.GameObjects.Container | null = null;
  private damageLogBg: Phaser.GameObjects.Rectangle | null = null;
  private damageLogText: Phaser.GameObjects.Text | null = null;
  private damageLogNavText: Phaser.GameObjects.Text | null = null;

  protected fieldIndex = 0;
  protected cursor2 = 0;

  constructor() {
    super(UiMode.COMMAND);
  }

  setup() {
    const ui = this.getUi();
    const commands = [
      i18next.t("commandUiHandler:fight"),
      i18next.t("commandUiHandler:ball"),
      i18next.t("commandUiHandler:pokemon"),
      i18next.t("commandUiHandler:run"),
    ];

    this.commandsContainer = globalScene.add.container(217, -38.7);
    this.commandsContainer.setName("commands");
    this.commandsContainer.setVisible(false);
    ui.add(this.commandsContainer);

    this.teraButton = globalScene.add.sprite(-32, 15, "button_tera");
    this.teraButton.setName("terastallize-button");
    this.teraButton.setScale(1.3);
    this.teraButton.setFrame("fire");
    this.teraButton.setPipeline(globalScene.spritePipeline, {
      tone: [0.0, 0.0, 0.0, 0.0],
      ignoreTimeTint: true,
      teraColor: getTypeRgb(PokemonType.FIRE),
      isTerastallized: false,
    });
    this.commandsContainer.add(this.teraButton);

    for (let c = 0; c < commands.length; c++) {
      const commandText = addTextObject(
        c % 2 === 0 ? 0 : 55.8,
        c < 2 ? 0 : 16,
        commands[c],
        TextStyle.WINDOW_BATTLE_COMMAND,
      );
      commandText.setName(commands[c]);
      this.commandsContainer.add(commandText);
    }

    // 创建伤害日志按钮容器（移动端虚拟按键）
    this.damageLogButton = globalScene.add.container(-60, -8);
    this.damageLogButton.setName("damage-log-button");
    this.damageLogButton.setVisible(false);

    // 按钮背景
    const buttonBg = globalScene.add.rectangle(0, 0, 24, 12, 0x333333, 0.8);
    buttonBg.setStrokeStyle(1, 0x666666);
    this.damageLogButton.add(buttonBg);

    // 按钮图标（E键）
    const buttonIcon = globalScene.add.sprite(0, 0, "keyboard", "E.png");
    buttonIcon.setScale(0.5);
    this.damageLogButton.add(buttonIcon);

    // 设置可交互
    buttonBg.setInteractive({ useHandCursor: true });
    buttonBg.on("pointerdown", () => {
      if (damageCalculationLog.getLastTurnEntries().length > 0) {
        this.showDamageLog();
        this.getUi().playSelect();
      }
    });

    this.commandsContainer.add(this.damageLogButton);
  }

  /**
   * 创建或获取伤害日志全屏覆盖层（延迟创建）
   */
  private ensureDamageLogOverlay(): void {
    if (this.damageLogOverlay) {
      return; // 已创建
    }

    const width = globalScene.scaledCanvas.width;
    const height = globalScene.scaledCanvas.height;

    // 使用负Y坐标，因为UI坐标系从底部开始
    this.damageLogOverlay = globalScene.add.container(0, -height);
    this.damageLogOverlay.setName("damage-log-overlay");
    this.damageLogOverlay.setVisible(false);

    // 半透明黑色背景 - 几乎全屏
    this.damageLogBg = globalScene.add.rectangle(width / 2, height / 2, width - 8, height - 8, 0x000000, 0.92);
    this.damageLogBg.setStrokeStyle(2, 0x4a90d9);
    this.damageLogOverlay.add(this.damageLogBg);

    // 日志文本 - 按行显示，通过截取数组实现滚动
    this.damageLogText = addTextObject(DAMAGE_LOG_CONFIG.PADDING, DAMAGE_LOG_CONFIG.PADDING, "", TextStyle.WINDOW, {
      wordWrap: { width: width - DAMAGE_LOG_CONFIG.PADDING * 2 - 8 },
    });
    this.damageLogText.setOrigin(0, 0);
    this.damageLogText.setLineSpacing(1);
    this.damageLogOverlay.add(this.damageLogText);

    // 导航提示文本（在底部）
    this.damageLogNavText = addTextObject(width / 2, height - DAMAGE_LOG_CONFIG.PADDING, "", TextStyle.WINDOW);
    this.damageLogNavText.setOrigin(0.5, 1);
    this.damageLogOverlay.add(this.damageLogNavText);

    this.getUi().add(this.damageLogOverlay);
  }

  show(args: any[]): boolean {
    super.show(args);

    this.fieldIndex = args.length > 0 ? (args[0] as number) : 0;

    this.commandsContainer.setVisible(true);

    let commandPhase: CommandPhase;
    const currentPhase = globalScene.phaseManager.getCurrentPhase();
    if (currentPhase?.is("CommandPhase")) {
      commandPhase = currentPhase;
    } else {
      commandPhase = globalScene.phaseManager.getStandbyPhase() as CommandPhase;
    }

    if (this.canTera()) {
      this.teraButton.setVisible(true);
      this.teraButton.setFrame(PokemonType[globalScene.getField()[this.fieldIndex].getTeraType()].toLowerCase());
    } else {
      this.teraButton.setVisible(false);
      if (this.getCursor() === Command.TERA) {
        this.setCursor(Command.FIGHT);
      }
    }
    this.toggleTeraButton();

    const messageHandler = this.getUi().getMessageHandler();
    messageHandler.bg.setVisible(true);
    messageHandler.commandWindow.setVisible(true);
    messageHandler.movesWindowContainer.setVisible(false);
    messageHandler.message.setWordWrapWidth(this.canTera() ? 910 : 1110);

    // 显示伤害日志按钮（如果有上一回合的伤害记录）
    const hasLastTurnDamage = damageCalculationLog.getLastTurnEntries().length > 0;
    if (this.damageLogButton) {
      this.damageLogButton.setVisible(hasLastTurnDamage);
    }

    messageHandler.showText(
      i18next.t("commandUiHandler:actionMessage", {
        pokemonName: getPokemonNameWithAffix(commandPhase.getPokemon()),
      }),
      0,
    );
    if (this.getCursor() === Command.POKEMON) {
      this.setCursor(Command.FIGHT);
    } else {
      this.setCursor(this.getCursor());
    }

    // 重置伤害日志显示状态
    this.showingDamageLog = false;
    this.damageLogCurrentIndex = 0;

    return true;
  }

  /**
   * 显示伤害日志
   */
  private showDamageLog(): void {
    const entries = damageCalculationLog.getLastTurnEntries();
    if (entries.length === 0) {
      return;
    }

    // 确保覆盖层已创建（延迟创建）
    this.ensureDamageLogOverlay();

    this.showingDamageLog = true;
    this.damageLogCurrentIndex = 0;
    this.damageLogScrollOffset = 0;
    this.updateDamageLogDisplay();

    // 显示覆盖层并移到最顶层
    if (this.damageLogOverlay) {
      this.damageLogOverlay.setVisible(true);
      // 将覆盖层移到UI容器的最上层
      const ui = this.getUi();
      ui.bringToTop(this.damageLogOverlay);
    }
  }

  /**
   * 更新伤害日志显示内容
   */
  private updateDamageLogDisplay(): void {
    const entries = damageCalculationLog.getLastTurnEntries();

    if (entries.length === 0) {
      if (this.damageLogText) {
        this.damageLogText.setText("上一回合没有造成伤害的攻击记录。");
      }
      if (this.damageLogNavText) {
        this.damageLogNavText.setText("按任意键返回");
      }
      this.damageLogLines = [];
      return;
    }

    const entry = entries[this.damageLogCurrentIndex];
    const logText = damageCalculationLog.formatEntry(entry);
    this.damageLogLines = logText.split("\n");

    // 按行截取显示，根据滚动偏移量选择显示的行
    const visibleLines = this.damageLogLines.slice(
      this.damageLogScrollOffset,
      this.damageLogScrollOffset + DAMAGE_LOG_CONFIG.VISIBLE_LINES,
    );

    if (this.damageLogText) {
      this.damageLogText.setText(visibleLines.join("\n"));
    }

    // 判断是否可以滚动
    const canScrollUp = this.damageLogScrollOffset > 0;
    const canScrollDown = this.damageLogScrollOffset + DAMAGE_LOG_CONFIG.VISIBLE_LINES < this.damageLogLines.length;

    // 构建导航提示
    const navParts: string[] = [];

    // 上下滚动提示
    if (canScrollUp || canScrollDown) {
      navParts.push("↑↓滚动");
    }

    // 左右切换提示
    if (entries.length > 1) {
      navParts.push(`←→切换(${this.damageLogCurrentIndex + 1}/${entries.length})`);
    }

    navParts.push("取消键返回");

    if (this.damageLogNavText) {
      this.damageLogNavText.setText(navParts.join(" | "));
    }
  }

  /**
   * 关闭伤害日志显示
   */
  private closeDamageLog(): void {
    this.showingDamageLog = false;
    this.damageLogCurrentIndex = 0;
    this.damageLogScrollOffset = 0;
    this.damageLogLines = [];

    // 隐藏覆盖层
    if (this.damageLogOverlay) {
      this.damageLogOverlay.setVisible(false);
    }
  }

  processInput(button: Button): boolean {
    const ui = this.getUi();

    let success = false;

    const cursor = this.getCursor();

    // 如果正在显示伤害日志，处理日志导航
    if (this.showingDamageLog) {
      const entries = damageCalculationLog.getLastTurnEntries();

      // 计算最大滚动行数
      const maxScrollOffset = Math.max(0, this.damageLogLines.length - DAMAGE_LOG_CONFIG.VISIBLE_LINES);

      switch (button) {
        // 上下滚动（按行）
        case Button.UP:
          if (this.damageLogScrollOffset > 0) {
            this.damageLogScrollOffset = Math.max(0, this.damageLogScrollOffset - DAMAGE_LOG_CONFIG.SCROLL_STEP);
            this.updateDamageLogDisplay();
            success = true;
          }
          break;
        case Button.DOWN:
          if (this.damageLogScrollOffset < maxScrollOffset) {
            this.damageLogScrollOffset = Math.min(
              maxScrollOffset,
              this.damageLogScrollOffset + DAMAGE_LOG_CONFIG.SCROLL_STEP,
            );
            this.updateDamageLogDisplay();
            success = true;
          }
          break;
        // 左右切换伤害记录
        case Button.LEFT:
          if (this.damageLogCurrentIndex > 0) {
            this.damageLogCurrentIndex--;
            this.damageLogScrollOffset = 0;
            this.updateDamageLogDisplay();
            success = true;
          }
          break;
        case Button.RIGHT:
          if (this.damageLogCurrentIndex < entries.length - 1) {
            this.damageLogCurrentIndex++;
            this.damageLogScrollOffset = 0;
            this.updateDamageLogDisplay();
            success = true;
          }
          break;
        // 关闭日志
        case Button.CANCEL:
        case Button.ACTION:
          this.closeDamageLog();
          success = true;
          break;
      }

      if (success) {
        ui.playSelect();
      }
      return success;
    }

    // 使用 Button.CYCLE_ABILITY (E键) 显示伤害日志
    if (button === Button.CYCLE_ABILITY && damageCalculationLog.getLastTurnEntries().length > 0) {
      this.showDamageLog();
      ui.playSelect();
      return true;
    }

    if (button === Button.CANCEL || button === Button.ACTION) {
      if (button === Button.ACTION) {
        switch (cursor) {
          // Fight
          case Command.FIGHT:
            ui.setMode(UiMode.FIGHT, (globalScene.phaseManager.getCurrentPhase() as CommandPhase).getFieldIndex());
            success = true;
            break;
          // Ball
          case Command.BALL:
            ui.setModeWithoutClear(UiMode.BALL);
            success = true;
            break;
          // Pokemon
          case Command.POKEMON:
            ui.setMode(
              UiMode.PARTY,
              PartyUiMode.SWITCH,
              (globalScene.phaseManager.getCurrentPhase() as CommandPhase).getPokemon().getFieldIndex(),
              null,
              PartyUiHandler.FilterNonFainted,
            );
            success = true;
            break;
          // Run
          case Command.RUN:
            (globalScene.phaseManager.getCurrentPhase() as CommandPhase).handleCommand(Command.RUN, 0);
            success = true;
            break;
          case Command.TERA:
            ui.setMode(
              UiMode.FIGHT,
              (globalScene.phaseManager.getCurrentPhase() as CommandPhase).getFieldIndex(),
              Command.TERA,
            );
            success = true;
            break;
        }
      } else {
        (globalScene.phaseManager.getCurrentPhase() as CommandPhase).cancel();
      }
    } else {
      switch (button) {
        case Button.UP:
          if (cursor === Command.POKEMON || cursor === Command.RUN) {
            success = this.setCursor(cursor - 2);
          }
          break;
        case Button.DOWN:
          if (cursor === Command.FIGHT || cursor === Command.BALL) {
            success = this.setCursor(cursor + 2);
          }
          break;
        case Button.LEFT:
          if (cursor === Command.BALL || cursor === Command.RUN) {
            success = this.setCursor(cursor - 1);
          } else if ((cursor === Command.FIGHT || cursor === Command.POKEMON) && this.canTera()) {
            success = this.setCursor(Command.TERA);
            this.toggleTeraButton();
          }
          break;
        case Button.RIGHT:
          if (cursor === Command.FIGHT || cursor === Command.POKEMON) {
            success = this.setCursor(cursor + 1);
          } else if (cursor === Command.TERA) {
            success = this.setCursor(Command.FIGHT);
            this.toggleTeraButton();
          }
          break;
      }
    }

    if (success) {
      ui.playSelect();
    }

    return success;
  }

  canTera(): boolean {
    const hasTeraMod = globalScene.getModifiers(TerastallizeAccessModifier).length > 0;
    const activePokemon = globalScene.getField()[this.fieldIndex];
    const isBlockedForm =
      activePokemon.isMega() || activePokemon.isMax() || activePokemon.hasSpecies(SpeciesId.NECROZMA, "ultra");
    const currentTeras = globalScene.arena.playerTerasUsed;
    const plannedTera =
      globalScene.currentBattle.preTurnCommands[0]?.command === Command.TERA && this.fieldIndex > 0 ? 1 : 0;
    return hasTeraMod && !isBlockedForm && currentTeras + plannedTera < 1;
  }

  toggleTeraButton() {
    this.teraButton.setPipeline(globalScene.spritePipeline, {
      tone: [0.0, 0.0, 0.0, 0.0],
      ignoreTimeTint: true,
      teraColor: getTypeRgb(globalScene.getField()[this.fieldIndex].getTeraType()),
      isTerastallized: this.getCursor() === Command.TERA,
    });
  }

  getCursor(): number {
    return !this.fieldIndex ? this.cursor : this.cursor2;
  }

  setCursor(cursor: number): boolean {
    const changed = this.getCursor() !== cursor;
    if (changed) {
      if (!this.fieldIndex) {
        this.cursor = cursor;
      } else {
        this.cursor2 = cursor;
      }
    }

    if (!this.cursorObj) {
      this.cursorObj = globalScene.add.image(0, 0, "cursor");
      this.commandsContainer.add(this.cursorObj);
    }

    if (cursor === Command.TERA) {
      this.cursorObj.setVisible(false);
    } else {
      this.cursorObj.setPosition(-5 + (cursor % 2 === 1 ? 56 : 0), 8 + (cursor >= 2 ? 16 : 0));
      this.cursorObj.setVisible(true);
    }

    return changed;
  }

  clear(): void {
    super.clear();
    this.getUi().getMessageHandler().commandWindow.setVisible(false);
    this.commandsContainer.setVisible(false);
    this.getUi().getMessageHandler().clearText();
    this.eraseCursor();

    // 关闭伤害日志覆盖层
    if (this.showingDamageLog) {
      this.closeDamageLog();
    }
  }

  eraseCursor(): void {
    if (this.cursorObj) {
      this.cursorObj.destroy();
    }
    this.cursorObj = null;
  }
}
