import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";

/**
 * Cheat system for development and testing
 * Uses button sequences similar to Konami Code
 */
export class CheatSystem {
  private static instance: CheatSystem;
  private enabled = true; // Set to false to disable cheats in production

  // Button sequence for cheats (Konami Code style)
  // UP, UP, DOWN, DOWN, LEFT, RIGHT, LEFT, RIGHT, ACTION, SUBMIT = Instant Victory
  private readonly VICTORY_CODE = [
    Button.UP,
    Button.UP,
    Button.DOWN,
    Button.DOWN,
    Button.LEFT,
    Button.RIGHT,
    Button.LEFT,
    Button.RIGHT,
    Button.ACTION,
    Button.SUBMIT,
  ];

  // UP, DOWN, LEFT, RIGHT, SUBMIT = Level Up
  private readonly LEVELUP_CODE = [Button.UP, Button.DOWN, Button.LEFT, Button.RIGHT, Button.SUBMIT];

  // LEFT, LEFT, RIGHT, RIGHT, SUBMIT = Add Money
  private readonly MONEY_CODE = [Button.LEFT, Button.LEFT, Button.RIGHT, Button.RIGHT, Button.SUBMIT];

  // UP, UP, DOWN, DOWN, SUBMIT = Heal All
  private readonly HEAL_CODE = [Button.UP, Button.UP, Button.DOWN, Button.DOWN, Button.SUBMIT];

  private inputSequence: Button[] = [];
  private readonly MAX_SEQUENCE_LENGTH = 10;
  private lastInputTime = 0;
  private readonly SEQUENCE_TIMEOUT = 2000; // 2 seconds timeout

  private constructor() {
    this.setupInputListeners();
  }

  static getInstance(): CheatSystem {
    if (!CheatSystem.instance) {
      CheatSystem.instance = new CheatSystem();
    }
    return CheatSystem.instance;
  }

  private setupInputListeners(): void {
    // Wait for scene to be ready
    const trySetup = () => {
      if (globalScene?.inputController?.events) {
        globalScene.inputController.events.on("input_down", (event: any) => {
          this.onButtonPressed(event.button);
        });
        console.log("[CHEAT] Cheat system initialized");
      } else {
        setTimeout(trySetup, 100);
      }
    };

    setTimeout(trySetup, 1000);
  }

  private onButtonPressed(button: Button): void {
    if (!this.enabled) {
      return;
    }

    const now = Date.now();

    // Reset sequence if too much time has passed
    if (now - this.lastInputTime > this.SEQUENCE_TIMEOUT) {
      this.inputSequence = [];
    }

    this.lastInputTime = now;
    this.inputSequence.push(button);

    // Debug log - show button names
    const buttonNames = this.inputSequence.map(b => Button[b]).join(", ");
    console.log(`[CHEAT] Button sequence: [${buttonNames}]`);

    // Keep sequence length manageable
    if (this.inputSequence.length > this.MAX_SEQUENCE_LENGTH) {
      this.inputSequence.shift();
    }

    // Check for cheat codes
    this.checkCheatCodes();
  }

  private checkCheatCodes(): void {
    if (this.matchesSequence(this.VICTORY_CODE)) {
      console.log("[CHEAT] Victory code activated!");
      this.instantVictory();
      this.inputSequence = [];
    } else if (this.matchesSequence(this.LEVELUP_CODE)) {
      console.log("[CHEAT] Level up code activated!");
      this.levelUpAllPokemon();
      this.inputSequence = [];
    } else if (this.matchesSequence(this.MONEY_CODE)) {
      console.log("[CHEAT] Money code activated!");
      this.addMoney();
      this.inputSequence = [];
    } else if (this.matchesSequence(this.HEAL_CODE)) {
      console.log("[CHEAT] Heal code activated!");
      this.healAllPokemon();
      this.inputSequence = [];
    }
  }

  private matchesSequence(targetSequence: Button[]): boolean {
    if (this.inputSequence.length < targetSequence.length) {
      return false;
    }

    const recentInputs = this.inputSequence.slice(-targetSequence.length);
    return recentInputs.every((button, index) => button === targetSequence[index]);
  }

  /**
   * Instantly win the current game (Classic mode only)
   */
  private instantVictory(): void {
    if (!globalScene.currentBattle) {
      console.log("[CHEAT] No active battle");
      return;
    }

    // Only work in Classic mode
    if (!globalScene.gameMode.isClassic) {
      console.log("[CHEAT] Instant victory only works in Classic/Challenge/Random Stats mode");
      return;
    }

    console.log("[CHEAT] Instant Victory activated!");

    // Set wave to 200 (final wave)
    globalScene.currentBattle.waveIndex = 200;

    // Trigger victory
    globalScene.phaseManager.clearPhaseQueue();
    globalScene.phaseManager.unshiftNew("GameOverPhase", true);
  }

  /**
   * Level up all Pokemon by 10 levels
   */
  private levelUpAllPokemon(): void {
    const party = globalScene.getPlayerParty();
    if (party.length === 0) {
      console.log("[CHEAT] No Pokemon in party");
      return;
    }

    console.log("[CHEAT] Leveling up all Pokemon by 10 levels");
    party.forEach(pokemon => {
      if (pokemon.level < 100) {
        const newLevel = Math.min(100, pokemon.level + 10);
        pokemon.level = newLevel;
        pokemon.calculateStats();
        pokemon.updateInfo();
      }
    });

    globalScene.ui.showText("作弊指令：所有宝可梦等级+10！", null, () => {}, null, true);
  }

  /**
   * Add 10000 money
   */
  private addMoney(): void {
    console.log("[CHEAT] Adding 10000 money");
    globalScene.money += 10000;
    globalScene.updateMoneyText();
    globalScene.ui.showText("作弊指令：获得 ₽10000！", null, () => {}, null, true);
  }

  /**
   * Heal all Pokemon to full HP
   */
  private healAllPokemon(): void {
    const party = globalScene.getPlayerParty();
    if (party.length === 0) {
      console.log("[CHEAT] No Pokemon in party");
      return;
    }

    console.log("[CHEAT] Healing all Pokemon");
    party.forEach(pokemon => {
      pokemon.hp = pokemon.getMaxHp();
      pokemon.resetStatus();
      pokemon.updateInfo();
    });

    globalScene.ui.showText("作弊指令：所有宝可梦完全恢复！", null, () => {}, null, true);
  }

  /**
   * Enable or disable the cheat system
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`[CHEAT] Cheat system ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Check if cheats are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Auto-initialize when imported
CheatSystem.getInstance();
