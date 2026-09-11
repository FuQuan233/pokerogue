import { PokerogueAccountApi } from "#api/account-api";
import { speciesDataRegistry } from "#app/global-species-data-registry";
import { speciesEggMoves } from "#balance/egg-moves";
import { initGenerationSix } from "#balance/generation-06";
import { initGenerationEight } from "#balance/generation-08";
import { AbilityId } from "#enums/ability-id";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { applySessionVersionMigration } from "#system/version-converter";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("FuQuan migration", () => {
  it("migrates old form items, split species and random rolls only once", () => {
    const roll = [100, 101, 102, 103, 104, 105];
    const data = {
      gameVersion: "1.10.7",
      money: 100,
      party: [{ species: SpeciesId.GRENINJA, formIndex: 1, fusionSpecies: SpeciesId.BASCULIN, fusionFormIndex: 2 }],
      enemyParty: [],
      modifiers: [{ className: "PokemonFormChangeItemModifier", args: [1, 50], typePregenArgs: [50] }],
      enemyModifiers: [{ className: "PokemonFormChangeItemModifier", args: [2, 51], typePregenArgs: [51] }],
      randomizedStats: [
        [`${SpeciesId.GRENINJA}-1`, roll],
        [`${SpeciesId.BASCULIN}-2`, roll],
      ],
    };
    applySessionVersionMigration(data);
    expect(data.party[0]).toMatchObject({
      species: SpeciesId.BATTLE_BOND_GRENINJA,
      formIndex: 0,
      fusionSpecies: SpeciesId.HISUI_BASCULIN,
      fusionFormIndex: 0,
    });
    expect(data.modifiers[0].args[1]).toBe(100);
    expect(data.enemyModifiers[0].typePregenArgs[0]).toBe(101);
    expect(data.randomizedStats).toContainEqual([`${SpeciesId.BATTLE_BOND_GRENINJA}-0`, roll]);
    expect(data.randomizedStats).toContainEqual([`${SpeciesId.HISUI_BASCULIN}-0`, roll]);
    applySessionVersionMigration(data);
    expect(data.modifiers[0].args[1]).toBe(100);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("retains the custom base stats instead of upstream balance", () => {
    const expected = [
      [SpeciesId.DELIBIRD, [200, 10, 120, 190, 120, 140]],
      [SpeciesId.PACHIRISU, [255, 190, 250, 194, 250, 200]],
      [SpeciesId.DEDENNE, [10, 255, 10, 255, 10, 110]],
      [SpeciesId.PYUKUMUKU, [250, 5, 5, 5, 5, 140]],
      [SpeciesId.ANNIHILAPE, [150, 140, 100, 70, 100, 100]],
    ] as const;
    for (const [id, stats] of expected) {
      expect(speciesDataRegistry.getSpecies(id).baseStats).toEqual(stats);
    }
    expect(speciesDataRegistry.getSpecies(SpeciesId.DEOXYS).forms).toHaveLength(4);
    expect(speciesEggMoves[SpeciesId.MANKEY]).toEqual([
      MoveId.WAVE_CRASH,
      MoveId.GLACIAL_LANCE,
      MoveId.FLARE_BLITZ,
      MoveId.DOUBLE_IRON_BASH,
    ]);
    expect(speciesDataRegistry.getPassive(SpeciesId.DELIBIRD, 0)).toBe(AbilityId.SIMPLE);
  });

  it("restores all species data for the three excluded DIY Pokemon", () => {
    const upstream = { ...initGenerationSix(), ...initGenerationEight() };
    for (const id of [SpeciesId.PUMPKABOO, SpeciesId.GOURGEIST, SpeciesId.CRAMORANT]) {
      expect(speciesDataRegistry.getSpecies(id)).toEqual(upstream[id].species);
      expect(speciesDataRegistry.getSpeciesData(id).passives).toEqual(upstream[id].passives);
      expect(speciesDataRegistry.getSpeciesData(id).levelMoves).toEqual(upstream[id].levelMoves);
    }
  });

  it("omits only the unsupported version header for the private server", async () => {
    vi.stubEnv("VITE_SEND_CLIENT_VERSION", "0");
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await new PokerogueAccountApi("https://example.test").getInfo();
    const headers = new Headers(fetch.mock.calls[0][1].headers);
    expect(headers.has("PKR-Client-Version")).toBe(false);
    expect(headers.has("Authorization")).toBe(true);
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("keeps the version header enabled by default", async () => {
    vi.stubEnv("VITE_SEND_CLIENT_VERSION", "1");
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await new PokerogueAccountApi("https://example.test").getInfo();
    expect(new Headers(fetch.mock.calls[0][1].headers).get("PKR-Client-Version")).toBe("1.12.1.0");
  });
});
