import { getGameMode } from "#app/game-mode";
import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { BattleType } from "#enums/battle-type";
import { GameModes } from "#enums/game-modes";
import { TrainerType } from "#enums/trainer-type";
import { TrainerVariant } from "#enums/trainer-variant";
import { UiMode } from "#enums/ui-mode";
import type { EnemyPokemon, PlayerPokemon } from "#field/pokemon";
import { Trainer } from "#field/trainer";
// biome-ignore lint/performance/noNamespaceImport: Need to access Modifier classes dynamically via className
import * as Modifier from "#modifiers/modifier";
import type { RunEntry, SessionSaveData } from "#types/save-data";
import i18next from "i18next";

export class PvPBattlePhase extends Phase {
  public readonly phaseName = "PvPBattlePhase";
  private playerRun: RunEntry;
  private opponentRun: RunEntry;
  private opponentName: string;
  private opponentTrainerId: number;
  private playerRunData: SessionSaveData;

  constructor(
    playerRun: RunEntry,
    opponentRun: RunEntry,
    opponentName: string,
    opponentTrainerId: number,
    playerRunData: SessionSaveData,
  ) {
    super();
    this.playerRun = playerRun;
    this.opponentRun = opponentRun;
    this.opponentName = opponentName;
    this.opponentTrainerId = opponentTrainerId;
    this.playerRunData = playerRunData;
  }

  start(): void {
    console.log("[PvPBattlePhase] Phase started");
    super.start();

    // Set up PvP game mode
    globalScene.gameMode = getGameMode(GameModes.PVP);
    console.log("[PvPBattlePhase] Game mode set to PVP");

    // Reset scene for fresh battle
    globalScene.money = 0;
    globalScene.score = 0;
    globalScene.updateMoneyText();
    globalScene.updateScoreText();

    // Set seed for reproducible battles (optional)
    globalScene.setSeed(Date.now().toString());
    globalScene.resetSeed();
    console.log("[PvPBattlePhase] Scene reset complete");

    // Show battle start message
    globalScene.ui.setMode(UiMode.MESSAGE);
    console.log("[PvPBattlePhase] Showing battle start message");
    globalScene.ui.showText(
      i18next.t("pvp:battleStart") + "\n" + i18next.t("pvp:vsPlayer", { playerName: this.opponentName }),
      null,
      () => {
        console.log("[PvPBattlePhase] Battle start message acknowledged, setting up battle...");
        this.setupBattle();
      },
    );
  }

  setupBattle(): void {
    console.log("[PvPBattlePhase] setupBattle called");

    // Clear existing parties
    const playerParty = globalScene.getPlayerParty();
    playerParty.splice(0, playerParty.length);
    const enemyParty = globalScene.getEnemyParty();
    enemyParty.splice(0, enemyParty.length);
    console.log("[PvPBattlePhase] Parties cleared");

    const loadPokemonAssets: Promise<void>[] = [];

    // Add player's pokemon from victory run
    console.log("[PvPBattlePhase] Loading player's pokemon, count:", this.playerRun.entry.party.length);
    for (const pokemonData of this.playerRun.entry.party) {
      const pokemon = pokemonData.toPokemon() as PlayerPokemon;
      pokemon.setVisible(true); // Show player's pokemon in PvP
      loadPokemonAssets.push(pokemon.loadAssets(false));
      playerParty.push(pokemon);
    }
    console.log("[PvPBattlePhase] Player's pokemon loaded");

    // Apply player's modifiers
    console.log("[PvPBattlePhase] Applying player's modifiers, count:", this.playerRun.entry.modifiers.length);
    for (const modifierData of this.playerRun.entry.modifiers) {
      const modifier = modifierData.toModifier(Modifier[modifierData.className]);
      if (modifier) {
        globalScene.addModifier(modifier, true, false, false, true);
      }
    }
    globalScene.updateModifiers(true);

    // Initialize battle and arena (order matters!)
    console.log("[PvPBattlePhase] Initializing battle and arena...");
    // Create battle as TRAINER type to prevent pokeball usage
    globalScene.newBattle(1, BattleType.TRAINER);
    // Create a dummy trainer for PvP mode
    const dummyTrainer = new Trainer(TrainerType.YOUNGSTER, TrainerVariant.DEFAULT);
    dummyTrainer.setName(this.opponentName);
    globalScene.currentBattle.trainer = dummyTrainer;
    globalScene.field.add(dummyTrainer); // Add trainer to scene
    // Link battle.enemyParty to globalScene's enemy party so EncounterPhase can find them
    globalScene.currentBattle.enemyParty = globalScene.getEnemyParty();
    globalScene.arena.init();

    // Set session time
    globalScene.sessionPlayTime = 0;
    globalScene.lastSavePlayTime = 0;
    console.log("[PvPBattlePhase] Battle and arena initialized");

    Promise.all(loadPokemonAssets).then(() => {
      console.log("[PvPBattlePhase] Player assets loaded, loading opponent team...");
      // Load opponent's pokemon
      this.loadOpponentTeam();
    });
  }

  loadOpponentTeam(): void {
    const battle = globalScene.currentBattle;
    const enemyParty = globalScene.getEnemyParty();
    const loadEnemyAssets: Promise<void>[] = [];

    // Clear and initialize battle.enemyLevels first
    battle.enemyLevels = [];

    // Load opponent's pokemon as enemy pokemon
    for (let i = 0; i < this.opponentRun.entry.party.length; i++) {
      const pokemonData = this.opponentRun.entry.party[i];
      // Ensure the pokemon is created as an enemy by setting player to false
      pokemonData.player = false;
      const enemyPokemon = pokemonData.toPokemon(BattleType.TRAINER, i, false) as EnemyPokemon;

      // Make it an AI-controlled enemy (but visible for PvP)
      enemyPokemon.setVisible(true);
      loadEnemyAssets.push(enemyPokemon.loadAssets());
      enemyParty.push(enemyPokemon);

      // Add level to battle.enemyLevels
      battle.enemyLevels.push(enemyPokemon.level);
    }

    console.log("[PvPBattlePhase] Loaded opponent team:", {
      enemyPartyLength: enemyParty.length,
      enemyLevelsLength: battle.enemyLevels.length,
      enemyLevels: battle.enemyLevels,
    });

    // Apply opponent's modifiers (to enemy side)
    for (const modifierData of this.opponentRun.entry.modifiers) {
      const modifier = modifierData.toModifier(Modifier[modifierData.className]);
      if (modifier) {
        globalScene.addModifier(modifier, false, false, false, true);
      }
    }
    globalScene.updateModifiers(false);

    Promise.all(loadEnemyAssets).then(() => {
      // Set up AI for opponent's pokemon
      if (globalScene.currentBattle.trainer) {
        globalScene.currentBattle.trainer.genAI(globalScene.getEnemyParty());
      }
      // Start the battle
      this.startPvPBattle();
    });
  }

  startPvPBattle(): void {
    console.log("[PvPBattlePhase] startPvPBattle called");
    globalScene.currentBattle.started = true;

    // Queue up battle phases
    console.log("[PvPBattlePhase] Queueing EncounterPhase...");
    globalScene.phaseManager.pushNew("EncounterPhase", true);

    // Set up PvPGameOverPhase with context for return navigation
    globalScene.gameData.pvpBattleContext = {
      playerRunData: this.playerRunData,
      opponentTrainerId: this.opponentTrainerId,
      opponentName: this.opponentName,
    };

    // Add custom end handler for PvP
    console.log("[PvPBattlePhase] Battle setup complete, ending phase");
    this.end();
  }
}
