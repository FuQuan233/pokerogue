import { AbilityId } from "#enums/ability-id";
import { BattlerIndex } from "#enums/battler-index";
import { Button } from "#enums/buttons";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { CheatSystem } from "#system/cheat-system";
import { GameManager } from "#test/framework/game-manager";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Cheats - next strike", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;

  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });

  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override
      .battleStyle("single")
      .ability(AbilityId.BALL_FETCH)
      .passiveAbility(AbilityId.BALL_FETCH)
      .moveset([MoveId.TACKLE, MoveId.SPLASH, MoveId.EARTHQUAKE])
      .startingLevel(5)
      .enemySpecies(SpeciesId.GENGAR)
      .enemyAbility(AbilityId.STURDY)
      .enemyPassiveAbility(AbilityId.BALL_FETCH)
      .enemyMoveset(MoveId.EXTREME_SPEED)
      .enemyLevel(100)
      .enemyHealthSegments(4);
  });

  it("outranks faster priority moves and bypasses immunity, Sturdy and boss segments once", async () => {
    await game.classicMode.startBattle(SpeciesId.SHUCKLE);
    const player = game.field.getPlayerPokemon();
    const enemy = game.field.getEnemyPokemon();
    const hp = player.hp;
    game.scene.currentBattle.nextStrikeCheat = true;
    game.move.select(MoveId.TACKLE);
    await game.phaseInterceptor.to("DamageAnimPhase");
    expect(enemy.hp).toBe(0);
    expect(player.hp).toBe(hp);
    expect(game.scene.currentBattle.nextStrikeCheat).toBe(false);
    await game.phaseInterceptor.to("VictoryPhase");
    expect(game.scene.currentBattle.waveIndex).toBe(1);
  });

  it("preserves the charge for an attack after a status move", async () => {
    game.override.enemyMoveset(MoveId.SPLASH);
    await game.classicMode.startBattle(SpeciesId.SHUCKLE);
    game.scene.currentBattle.nextStrikeCheat = true;
    game.move.select(MoveId.SPLASH);
    await game.toEndOfTurn();
    expect(game.scene.currentBattle.nextStrikeCheat).toBe(true);
    expect(game.field.getEnemyPokemon().hp).toBeGreaterThan(0);
  });

  it("only KOs the selected enemy in doubles", async () => {
    game.override.battleStyle("double").enemyMoveset(MoveId.SPLASH);
    await game.classicMode.startBattle(SpeciesId.SHUCKLE, SpeciesId.SHUCKLE);
    const enemies = game.scene.getEnemyField();
    game.scene.currentBattle.nextStrikeCheat = true;
    game.move.select(MoveId.TACKLE, BattlerIndex.PLAYER, BattlerIndex.ENEMY_2);
    game.move.select(MoveId.TACKLE, BattlerIndex.PLAYER_2, BattlerIndex.ENEMY);
    await game.toEndOfTurn();
    expect(enemies[1].hp).toBe(0);
    expect(enemies[0].hp).toBe(enemies[0].getMaxHp());
    expect(game.scene.currentBattle.nextStrikeCheat).toBe(false);
  });

  it("spread attacks only consume one charge on one enemy, never an ally", async () => {
    game.override.battleStyle("double").enemyMoveset(MoveId.SPLASH);
    await game.classicMode.startBattle(SpeciesId.SHUCKLE, SpeciesId.SHUCKLE);
    const enemies = game.scene.getEnemyField();
    const ally = game.scene.getPlayerField()[1];
    const hp = ally.hp;
    game.scene.currentBattle.nextStrikeCheat = true;
    game.move.select(MoveId.EARTHQUAKE);
    game.move.select(MoveId.SPLASH, BattlerIndex.PLAYER_2);
    await game.phaseInterceptor.to("DamageAnimPhase");
    expect(enemies.filter(enemy => enemy.hp === 0)).toHaveLength(1);
    expect(ally.hp).toBe(hp);
  });

  it("arms through the button sequence and clears when cheats are disabled", async () => {
    await game.classicMode.startBattle(SpeciesId.SHUCKLE);
    const cheat = CheatSystem.getInstance();
    cheat.setEnabled(true);
    vi.spyOn(game.scene.ui, "showText").mockImplementation(() => {});
    for (const button of [Button.RIGHT, Button.RIGHT, Button.LEFT, Button.LEFT, Button.SUBMIT]) {
      cheat["onButtonPressed"](button);
    }
    expect(game.scene.currentBattle.nextStrikeCheat).toBe(true);
    cheat.setEnabled(false);
    expect(game.scene.currentBattle.nextStrikeCheat).toBe(false);
    cheat.setEnabled(true);
  });

  it("also KOs the final boss without restoring 1 HP or forcing a transformation", async () => {
    await game.classicMode.startBattle(SpeciesId.SHUCKLE);
    vi.spyOn(game.scene.currentBattle, "isClassicFinalBoss", "get").mockReturnValue(true);
    const transform = vi.spyOn(game.scene, "initFinalBossPhaseTwo");
    const enemy = game.field.getEnemyPokemon();
    game.scene.currentBattle.nextStrikeCheat = true;
    game.move.select(MoveId.TACKLE);
    await game.phaseInterceptor.to("VictoryPhase");
    expect(enemy.hp).toBe(0);
    expect(transform).not.toHaveBeenCalled();
  });
});
