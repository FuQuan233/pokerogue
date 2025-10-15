import { getGameMode } from "#app/game-mode";
import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { BattleType } from "#enums/battle-type";
import { GameModes } from "#enums/game-modes";
import { UiMode } from "#enums/ui-mode";
import type { PlayerPokemon } from "#field/pokemon";
import type { VictoryTeam } from "#types/pvp-data";
import i18next from "i18next";

export class PvPBattlePhase extends Phase {
  public readonly phaseName = "PvPBattlePhase";
  private playerTeam: VictoryTeam;
  private opponentTeam: VictoryTeam;
  private opponentName: string;

  constructor(playerTeam: VictoryTeam, opponentTeam: VictoryTeam, opponentName: string) {
    super();
    this.playerTeam = playerTeam;
    this.opponentTeam = opponentTeam;
    this.opponentName = opponentName;
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
    globalScene.setSeed();
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
    // Initialize arena
    globalScene.newArena(globalScene.arena.biomeType);
    globalScene.arena.init();

    // Load player's team
    const playerParty = globalScene.getPlayerParty();
    playerParty.splice(0, playerParty.length); // Clear existing party

    const loadPokemonAssets: Promise<void>[] = [];

    // Add player's pokemon from victory team
    for (const pokemonData of this.playerTeam.party) {
      const pokemon = pokemonData.toPokemon() as PlayerPokemon;
      pokemon.setVisible(false);
      loadPokemonAssets.push(pokemon.loadAssets(false));
      playerParty.push(pokemon);
    }

    // Apply player's modifiers
    for (const modifierData of this.playerTeam.modifiers) {
      const modifier = modifierData.toModifier();
      if (modifier) {
        globalScene.addModifier(modifier, true, false, false, true);
      }
    }
    globalScene.updateModifiers(true);

    // Create battle against opponent team
    const battle = globalScene.newBattle(1, BattleType.WILD, undefined, false);

    Promise.all(loadPokemonAssets).then(() => {
      // Load opponent's pokemon
      this.loadOpponentTeam(battle);
    });
  }

  loadOpponentTeam(battle: any): void {
    const enemyParty = globalScene.getEnemyParty();
    const loadEnemyAssets: Promise<void>[] = [];

    // Load opponent's pokemon as enemy pokemon
    for (let i = 0; i < this.opponentTeam.party.length; i++) {
      const pokemonData = this.opponentTeam.party[i];
      const enemyPokemon = pokemonData.toPokemon(BattleType.WILD, i, false);

      // Make it an AI-controlled enemy
      enemyPokemon.setVisible(false);
      loadEnemyAssets.push(enemyPokemon.loadAssets());
      enemyParty.push(enemyPokemon);
      battle.enemyLevels.push(enemyPokemon.level);
    }

    // Apply opponent's modifiers (to enemy side)
    for (const modifierData of this.opponentTeam.modifiers) {
      const modifier = modifierData.toModifier();
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

    // Add custom end handler for PvP
    this.end();
  }
}
