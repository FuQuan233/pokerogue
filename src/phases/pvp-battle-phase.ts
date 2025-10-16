import { getGameMode } from "#app/game-mode";
import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { BattleType } from "#enums/battle-type";
import { GameModes } from "#enums/game-modes";
import { UiMode } from "#enums/ui-mode";
import type { EnemyPokemon, PlayerPokemon } from "#field/pokemon";
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
    super.start();

    // Set up PvP game mode
    globalScene.gameMode = getGameMode(GameModes.PVP);

    // Reset scene for fresh battle
    globalScene.money = 0;
    globalScene.score = 0;
    globalScene.updateMoneyText();
    globalScene.updateScoreText();

    // Set seed for reproducible battles (optional)
    globalScene.setSeed(Date.now().toString());
    globalScene.resetSeed();

    // Show battle start message
    globalScene.ui.setMode(UiMode.MESSAGE);
    globalScene.ui.showText(
      i18next.t("pvp:battleStart") + "\n" + i18next.t("pvp:vsPlayer", { playerName: this.opponentName }),
      null,
      () => {
        this.setupBattle();
      },
    );
  }

  setupBattle(): void {
    // Clear existing parties
    const playerParty = globalScene.getPlayerParty();
    playerParty.splice(0, playerParty.length);
    const enemyParty = globalScene.getEnemyParty();
    enemyParty.splice(0, enemyParty.length);

    const loadPokemonAssets: Promise<void>[] = [];

    // Add player's pokemon from victory run
    for (const pokemonData of this.playerRun.entry.party) {
      const pokemon = pokemonData.toPokemon() as PlayerPokemon;
      pokemon.setVisible(false);
      loadPokemonAssets.push(pokemon.loadAssets(false));
      playerParty.push(pokemon);
    }

    // Apply player's modifiers
    for (const modifierData of this.playerRun.entry.modifiers) {
      const modifier = modifierData.toModifier(this.constructor);
      if (modifier) {
        globalScene.addModifier(modifier, true, false, false, true);
      }
    }
    globalScene.updateModifiers(true);

    // Initialize battle and arena (order matters!)
    globalScene.newBattle();
    globalScene.arena.init();

    // Set session time
    globalScene.sessionPlayTime = 0;
    globalScene.lastSavePlayTime = 0;

    Promise.all(loadPokemonAssets).then(() => {
      // Load opponent's pokemon
      this.loadOpponentTeam();
    });
  }

  loadOpponentTeam(): void {
    const battle = globalScene.currentBattle;
    const enemyParty = globalScene.getEnemyParty();
    const loadEnemyAssets: Promise<void>[] = [];

    // Load opponent's pokemon as enemy pokemon
    for (let i = 0; i < this.opponentRun.entry.party.length; i++) {
      const pokemonData = this.opponentRun.entry.party[i];
      // Ensure the pokemon is created as an enemy by setting player to false
      pokemonData.player = false;
      const enemyPokemon = pokemonData.toPokemon(BattleType.WILD, i, false) as EnemyPokemon;

      // Make it an AI-controlled enemy
      enemyPokemon.setVisible(false);
      loadEnemyAssets.push(enemyPokemon.loadAssets());
      enemyParty.push(enemyPokemon);
      if (battle.enemyLevels) {
        battle.enemyLevels.push(enemyPokemon.level);
      }
    }

    // Apply opponent's modifiers (to enemy side)
    for (const modifierData of this.opponentRun.entry.modifiers) {
      const modifier = modifierData.toModifier(this.constructor);
      if (modifier) {
        globalScene.addModifier(modifier, false, false, false, true);
      }
    }
    globalScene.updateModifiers(false);

    Promise.all(loadEnemyAssets).then(() => {
      // Start the battle
      this.startPvPBattle();
    });
  }

  startPvPBattle(): void {
    globalScene.currentBattle.started = true;

    // Queue up battle phases
    globalScene.phaseManager.pushNew("EncounterPhase", true);

    // Set up PvPGameOverPhase with context for return navigation
    globalScene.gameData.pvpBattleContext = {
      playerRunData: this.playerRunData,
      opponentTrainerId: this.opponentTrainerId,
      opponentName: this.opponentName,
    };

    // Add custom end handler for PvP
    this.end();
  }
}
