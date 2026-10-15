import { Button } from "#enums/buttons";
import { Nature } from "#enums/nature";
import { SpeciesId } from "#enums/species-id";
import { GameManager } from "#test/framework/game-manager";
import { initSceneWithoutEncounterPhase } from "#test/utils/game-manager-utils";
import { StarterSelectUiHandler } from "#ui/starter-select-ui-handler";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("UI - Starter nature cycling", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;
  let handler: StarterSelectUiHandler;

  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });

  beforeEach(() => {
    game = new GameManager(phaserGame);
    initSceneWithoutEncounterPhase(game.scene, [SpeciesId.ABRA]);
    handler = game.scene.ui.handlers.find(h => h instanceof StarterSelectUiHandler) as StarterSelectUiHandler;
    handler["lastStarterId"] = SpeciesId.ABRA;
    handler["starterPreferences"] = {};
    handler["originalStarterPreferences"] = {};
    handler["canCycle"].nature = true;
    handler["setStarterDetails"] = vi.fn();
  });

  it.each([
    [Nature.ADAMANT, Nature.TIMID, Nature.JOLLY, Nature.MODEST, Nature.CALM],
    [Nature.HARDY, Nature.BRAVE, Nature.QUIRKY],
    [Nature.CAREFUL, Nature.QUIRKY],
    Array.from({ length: 25 }, (_, n) => n as Nature),
  ])("cycles every unlocked nature and wraps to the first (%j)", (...unlocked: Nature[]) => {
    const dexEntry = game.scene.gameData.dexData[SpeciesId.ABRA];
    dexEntry.natureAttr = unlocked.reduce((attr, nature) => attr | (1 << (nature + 1)), 0);
    const menuNatures = game.scene.gameData.getNaturesForAttr(dexEntry.natureAttr);
    expect(menuNatures).toEqual(unlocked);

    // No saved preference: start from the first unlocked nature, just like the selection screen.
    for (const expected of [...menuNatures.slice(1), menuNatures[0]]) {
      expect(handler["processCycleButtonsInput"](Button.CYCLE_NATURE)).toBe(true);
      expect(handler["starterPreferences"][SpeciesId.ABRA]?.nature).toBe(expected);
      expect(handler["originalStarterPreferences"][SpeciesId.ABRA]?.nature).toBe(expected);
    }
  });

  it("continues from a nature chosen in the management menu", () => {
    const unlocked = [Nature.ADAMANT, Nature.TIMID, Nature.JOLLY, Nature.MODEST, Nature.CALM];
    game.scene.gameData.dexData[SpeciesId.ABRA].natureAttr = unlocked.reduce(
      (attr, nature) => attr | (1 << (nature + 1)),
      0,
    );
    handler["setNewNature"](SpeciesId.ABRA, Nature.JOLLY);
    handler["processCycleButtonsInput"](Button.CYCLE_NATURE);
    expect(handler["starterPreferences"][SpeciesId.ABRA]?.nature).toBe(Nature.MODEST);
  });
});
