import { allMoves, modifierTypes } from "#data/data-lists";
import { registerSphealBlessingIcon } from "#data/spheal-blessing-icon";
import { AbilityId } from "#enums/ability-id";
import { ModifierTier } from "#enums/modifier-tier";
import { MoveId } from "#enums/move-id";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesId } from "#enums/species-id";
import { SphealBlessingModifier } from "#modifiers/modifier";
import { modifierPool } from "#modifiers/modifier-pools";
import { ModifierData } from "#system/modifier-data";
import { GameManager } from "#test/framework/game-manager";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Items - Spheal Blessing", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;

  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });

  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override
      .battleStyle("single")
      .ability(AbilityId.INSOMNIA)
      .enemyAbility(AbilityId.INSOMNIA)
      .enemySpecies(SpeciesId.SNORLAX)
      .moveset([MoveId.SPLASH])
      .enemyMoveset([MoveId.ICE_BEAM])
      .startingLevel(100)
      .enemyLevel(100)
      .startingHeldItems([{ name: "SPHEAL_BLESSING" }]);
  });

  it.each([
    SpeciesId.GARCHOMP,
    SpeciesId.SNORLAX,
    SpeciesId.BLASTOISE,
    SpeciesId.EMPOLEON,
  ])("overrides weakness, neutrality and resistance for species %s", async species => {
    await game.classicMode.startBattle(species);
    const defender = game.field.getPlayerPokemon();
    const attacker = game.field.getEnemyPokemon();
    expect(defender.getAttackTypeEffectiveness(PokemonType.ICE)).toBe(0.125);
    expect(defender.getMoveEffectiveness(attacker, allMoves[MoveId.ICE_BEAM])).toBe(0.125);
    expect(defender.getMoveEffectiveness(attacker, allMoves[MoveId.FREEZE_DRY])).toBe(0.125);
    expect(defender.getMoveEffectiveness(attacker, allMoves[MoveId.SPLASH])).toBe(1);
    expect(attacker.getAttackTypeEffectiveness(PokemonType.ICE)).toBe(1);
  });

  it("uses the resistance during battle without changing other move types", async () => {
    await game.classicMode.startBattle(SpeciesId.GARCHOMP);
    const defender = game.field.getPlayerPokemon();
    expect(defender.getAttackTypeEffectiveness(PokemonType.DRAGON)).toBe(2);
    const spy = vi.spyOn(defender, "getMoveEffectiveness");
    game.move.select(MoveId.SPLASH);
    await game.toNextTurn();
    expect(spy).toHaveLastReturnedWith(0.125);
    expect(defender.hp).toBeLessThan(defender.getMaxHp());
  });

  it("caps at one and survives cloning and save restoration", async () => {
    await game.classicMode.startBattle(SpeciesId.GARCHOMP);
    const defender = game.field.getPlayerPokemon();
    const item = game.scene.findModifier(m => m instanceof SphealBlessingModifier) as SphealBlessingModifier;
    expect(item.getMaxHeldItemCount(defender)).toBe(1);
    expect(item.clone().match(item)).toBe(true);
    const restored = new ModifierData(JSON.parse(JSON.stringify(new ModifierData(item, true))), true).toModifier(
      SphealBlessingModifier,
    ) as SphealBlessingModifier;
    expect(restored.match(item)).toBe(true);
    expect(restored.stackCount).toBe(1);
    expect(restored.getArgs()).toEqual([defender.id]);
  });

  it("shares Quick Claw's Ultra tier and reward weight", async () => {
    await game.classicMode.startBattle(SpeciesId.GARCHOMP);
    const pool = modifierPool[ModifierTier.ULTRA];
    const blessing = pool.find(entry => entry.modifierType.id === "SPHEAL_BLESSING");
    const claw = pool.find(entry => entry.modifierType.id === "QUICK_CLAW");
    expect(blessing).toBeDefined();
    expect(claw).toBeDefined();
    expect(blessing?.weight).toBe(claw?.weight);
    expect(modifierTypes.SPHEAL_BLESSING().iconImage).toBe("spheal_blessing");
  });
});

describe("Spheal Blessing icon", () => {
  it("registers a centered Spheal frame for all item UIs without duplicating it", () => {
    const manager = new Phaser.Textures.TextureManager(new Phaser.Game({ type: Phaser.HEADLESS }));
    const items = manager.createCanvas("items", 32, 32)!;
    const icons = manager.createCanvas("pokemon_icons_3", 256, 673)!;
    icons.add("363", 0, 237, 554, 19, 16);
    registerSphealBlessingIcon(manager);
    const frame = items.get("spheal_blessing");
    expect(frame.source).toBe(icons.source[0]);
    expect([frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight]).toEqual([237, 554, 19, 16]);
    expect([frame.realWidth, frame.realHeight, frame.x, frame.y]).toEqual([32, 32, 6, 8]);
    registerSphealBlessingIcon(manager);
    expect(items.source).toHaveLength(2);
  });
});
