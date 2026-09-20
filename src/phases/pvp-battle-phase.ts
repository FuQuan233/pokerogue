import { getGameMode } from "#app/game-mode";
import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { validatePvpRun } from "#data/pvp-team";
import { AiType } from "#enums/ai-type";
import { BattleType } from "#enums/battle-type";
import { GameModes } from "#enums/game-modes";
import { TrainerType } from "#enums/trainer-type";
import { TrainerVariant } from "#enums/trainer-variant";
import { UiMode } from "#enums/ui-mode";
// biome-ignore lint/performance/noNamespaceImport: Saved modifiers identify their constructor by name.
import * as Modifier from "#modifiers/modifier";
import { ModifierData } from "#system/modifier-data";
import { PokemonData } from "#system/pokemon-data";
import { TrainerData } from "#system/trainer-data";
import type { RunEntry, SessionSaveData } from "#types/save-data";

/** Reconstruct two independent copies; even a self-challenge must not share IDs or mutable data. */
export async function preparePvpBattle(
  playerRun: RunEntry,
  opponentRun: RunEntry,
  opponentName: string,
): Promise<void> {
  validatePvpRun(playerRun);
  validatePvpRun(opponentRun);
  globalScene.reset();
  globalScene.gameMode = getGameMode(GameModes.PVP);
  globalScene.sessionPlayTime = 0;
  globalScene.lastSavePlayTime = 0;
  const battle = globalScene.newBattle({
    ...playerRun.entry,
    waveIndex: 1,
    battleType: BattleType.TRAINER,
    mysteryEncounterType: -1,
    trainer: new TrainerData({ trainerType: TrainerType.YOUNGSTER, variant: TrainerVariant.DEFAULT }),
  });
  battle.trainer!.setName(opponentName);
  globalScene.field.add(battle.trainer!);
  let nextId = 1000000;
  for (const [run, player] of [
    [playerRun, true],
    [opponentRun, false],
  ] as const) {
    const ids = new Map<number, number>();
    for (const saved of run.entry.party) {
      const raw = JSON.parse(JSON.stringify(saved));
      const id = nextId++;
      ids.set(raw.id, id);
      Object.assign(raw, { id, player, boss: false, bossSegments: 0, peoplePowerApplied: false, status: null });
      raw.summonData = undefined;
      raw.battleData = undefined;
      const data = new PokemonData(raw);
      const pokemon = data.toPokemon(BattleType.TRAINER, ids.size - 1, false);
      pokemon.setVisible(false);
      pokemon.resetSummonData();
      if (pokemon.isPlayer()) {
        globalScene.getPlayerParty().push(pokemon);
      } else if (pokemon.isEnemy()) {
        pokemon.aiType = AiType.SMART;
        battle.enemyParty.push(pokemon);
      }
    }
    for (const saved of run.entry.modifiers) {
      const data = new ModifierData(JSON.parse(JSON.stringify(saved)), player);
      const modifierConstructor = Modifier[data.className];
      if (!modifierConstructor || !(modifierConstructor.prototype instanceof Modifier.PersistentModifier)) {
        throw new Error(`无法还原道具：${data.typeId}。请使用相同版本的队伍记录。`);
      }
      if (modifierConstructor.prototype instanceof Modifier.PokemonHeldItemModifier) {
        const mapped = ids.get(data.args[0]);
        if (mapped == null) {
          throw new Error(`道具 ${data.typeId} 的携带者不在队伍中。`);
        }
        data.args[0] = mapped;
      }
      const modifier = data.toModifier(modifierConstructor);
      if (!modifier) {
        throw new Error(`无法还原道具：${data.typeId}。`);
      }
      if (player) {
        globalScene.addModifier(modifier, true, false, false, true);
      } else {
        await globalScene.addEnemyModifier(modifier, true, true);
      }
    }
  }
  globalScene.updateModifiers(true, true);
  globalScene.updateModifiers(false, true);
  for (const pokemon of [...globalScene.getPlayerParty(), ...globalScene.getEnemyParty()]) {
    pokemon.calculateStats();
    pokemon.hp = pokemon.getMaxHp();
    pokemon.status = null;
    pokemon.getMoveset().forEach(move => {
      move.ppUsed = 0;
    });
  }
  battle.enemyLevels = battle.enemyParty.map(p => p.level);
}

export class PvPBattlePhase extends Phase {
  public readonly phaseName = "PvPBattlePhase";

  constructor(
    private readonly playerRun: RunEntry,
    private readonly opponentRun: RunEntry,
    private readonly opponentName: string,
    private readonly opponentTrainerId = 0,
    private readonly playerRunData: SessionSaveData = playerRun.entry,
  ) {
    super();
  }

  override async start(): Promise<void> {
    super.start();
    try {
      await preparePvpBattle(this.playerRun, this.opponentRun, this.opponentName);
      await Promise.all([
        ...globalScene.getPlayerParty().map(p => p.loadAssets()),
        ...globalScene.getEnemyParty().map(p => p.loadAssets()),
        globalScene.currentBattle.trainer!.loadAssets(),
      ]);
      globalScene.gameData.pvpBattleContext = {
        playerRunData: this.playerRunData,
        opponentName: this.opponentName,
        opponentTrainerId: this.opponentTrainerId,
      };
      await globalScene.ui.setMode(UiMode.MESSAGE);
      globalScene.phaseManager.pushNew("EncounterPhase", true);
      // Loaded encounters don't summon the player. This is a fresh fight from a snapshot.
      globalScene.phaseManager.pushNew("SummonPhase", 0);
      this.end();
    } catch (error) {
      globalScene.reset();
      await globalScene.ui.setMode(UiMode.MESSAGE);
      globalScene.ui.showText(
        `无法开始 PVP：${error instanceof Error ? error.message : "队伍加载失败"}`,
        null,
        () => {
          globalScene.phaseManager.clearPhaseQueue();
          globalScene.phaseManager.pushNew("TitlePhase");
          this.end();
        },
        null,
        true,
      );
    }
  }
}
