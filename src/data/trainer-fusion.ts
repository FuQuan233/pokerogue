import { globalScene } from "#app/global-scene";
import { speciesDataRegistry } from "#app/global-species-data-registry";
import { getLevelTotalExp } from "#data/exp";
import { Gender } from "#data/gender";
import { CustomPokemonData } from "#data/pokemon-data";
import { type TrainerFusionBuild, trainerFusionPools } from "#data/trainer-fusion-pools";
import { getTrainerVarietyPool } from "#data/trainer-fusion-variety";
import { getTrainerStrength } from "#data/trainer-strength";
import { getTypeDamageMultiplier } from "#data/type";
import { AbilityId } from "#enums/ability-id";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesId } from "#enums/species-id";
import { Stat } from "#enums/stat";
import { TrainerType } from "#enums/trainer-type";
import type { EnemyPokemon, Pokemon } from "#field/pokemon";
import type { Trainer } from "#field/trainer";
import { randSeedInt } from "#utils/common";

function buildStats(build: TrainerFusionBuild): number[] {
  const a = speciesDataRegistry.getPokemonSpeciesForm(build[0], 0).baseStats;
  const b = speciesDataRegistry.getPokemonSpeciesForm(build[1], 0).baseStats;
  return a.map((v, i) => Math.max(v, b[i]));
}

function buildTypes(build: TrainerFusionBuild): PokemonType[] {
  const forms = [build[0], build[1]].map(id => speciesDataRegistry.getPokemonSpeciesForm(id, 0));
  return [...new Set(forms.flatMap(f => [f.type1, f.type2]).filter(t => t != null))];
}

/** Deterministic team preview, using party typing and bulk rather than future turn commands. */
export function scoreRivalFusion(build: TrainerFusionBuild, party: readonly Pokemon[]): number {
  const stats = buildStats(build);
  const types = buildTypes(build);
  const abilities = [build[2], build[3], build[4], build[5]];
  const physical = abilities.includes(AbilityId.HUGE_POWER) || stats[Stat.ATK] > stats[Stat.SPATK];
  const immunity: Partial<Record<AbilityId, PokemonType>> = {
    [AbilityId.LEVITATE]: PokemonType.GROUND,
    [AbilityId.EARTH_EATER]: PokemonType.GROUND,
    [AbilityId.WELL_BAKED_BODY]: PokemonType.FIRE,
    [AbilityId.WATER_ABSORB]: PokemonType.WATER,
    [AbilityId.SAP_SIPPER]: PokemonType.GRASS,
    [AbilityId.VOLT_ABSORB]: PokemonType.ELECTRIC,
  };
  return party.reduce((score, opponent) => {
    const defenderStats = opponent.calculateBaseStats();
    const offense = Math.max(...types.map(t => opponent.getAttackTypeEffectiveness(t)));
    const incoming = Math.max(
      ...opponent
        .getTypes()
        .map(t =>
          abilities.some(a => immunity[a] === t) ? 0 : types.reduce((v, own) => v * getTypeDamageMultiplier(t, own), 1),
        ),
    );
    const defense = defenderStats[physical ? Stat.DEF : Stat.SPDEF];
    const pressure = (offense * stats[physical ? Stat.ATK : Stat.SPATK]) / Math.max(1, defense);
    return score + pressure * 3 - incoming + stats[Stat.SPD] / Math.max(1, defenderStats[Stat.SPD]);
  }, 0);
}

export function getTrainerFusionCount(type: TrainerType, wave: number, partySize: number): number {
  if (wave < 95 || !trainerFusionPools[type]) {
    return 0;
  }
  if (type >= TrainerType.RIVAL && type <= TrainerType.RIVAL_6) {
    return Math.min(partySize, type >= TrainerType.RIVAL_4 ? 2 : 1);
  }
  return Math.min(partySize, wave < 30 ? 0 : wave < 80 ? 1 : wave < 140 ? 2 : 3);
}

/** Named doubles alternate owners; keep each owner's pool and number of replacements independent. */
export function selectTrainerFusion(trainer: Trainer, index: number): TrainerFusionBuild | undefined {
  const profile = getTrainerStrength();
  if (!profile) {
    return;
  }
  const paired = trainer.config.trainerTypeDouble && trainer.isDouble() && !trainer.config.doubleOnly;
  const partner = paired && index % 2 === 1;
  const type = partner ? trainer.config.trainerTypeDouble! : trainer.config.trainerType;
  const size = trainer.getPartyTemplate().size;
  const ownerSize = paired ? (partner ? Math.floor(size / 2) : Math.ceil(size / 2)) : size;
  const ownerIndex = paired ? Math.floor(index / 2) : index;
  const count = getTrainerFusionCount(type, profile.wave, ownerSize);
  const fromEnd = ownerSize - 1 - ownerIndex;
  const pool = trainerFusionPools[type];
  if (!pool || fromEnd < 0 || fromEnd >= count) {
    return;
  }
  const variety = getTrainerVarietyPool(type, profile.wave);
  // Old high-powered builds are endgame-only. Remove the oppressive fixed Rayquaza/Archaludon pair entirely.
  const candidates =
    profile.wave < 195
      ? variety
      : [...variety, ...pool.filter(build => !(build[0] === SpeciesId.RAYQUAZA && build[1] === SpeciesId.ARCHALUDON))];
  // Recreate one seeded ordering per owner, so slots don't duplicate builds and reloads don't reroll.
  globalScene.executeWithSeedOffset(
    () => {
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = randSeedInt(i + 1);
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
    },
    profile.wave * 1000 + type,
  );
  return candidates[fromEnd];
}

/** Runs only on fresh generation, before assets/held items/save data; preserves the slot's boss HP bars and ID. */
export function applyTrainerFusion(pokemon: EnemyPokemon, trainer: Trainer, index: number): void {
  const build = selectTrainerFusion(trainer, index);
  if (!build) {
    return;
  }
  pokemon.species = speciesDataRegistry.getSpecies(build[0]);
  pokemon.exp = getLevelTotalExp(pokemon.level, pokemon.species.growthRate);
  pokemon.friendship = pokemon.species.baseFriendship;
  pokemon.metSpecies = pokemon.species.speciesId;
  pokemon.formIndex = 0;
  pokemon.abilityIndex = 0;
  pokemon.fusionSpecies = speciesDataRegistry.getSpecies(build[1]);
  pokemon.fusionFormIndex = 0;
  pokemon.fusionAbilityIndex = 0;
  const gender = (malePercent: number | null) =>
    malePercent == null ? Gender.GENDERLESS : pokemon.id % 256 < malePercent * 2.56 ? Gender.MALE : Gender.FEMALE;
  pokemon.gender = gender(pokemon.species.malePercent);
  pokemon.fusionGender = gender(pokemon.fusionSpecies.malePercent);
  pokemon.fusionShiny = pokemon.shiny;
  pokemon.fusionVariant = pokemon.variant;
  pokemon.fusionLuck = pokemon.luck;
  pokemon.passive = true;
  pokemon.customPokemonData = new CustomPokemonData();
  pokemon.fusionCustomPokemonData = new CustomPokemonData();
  [
    pokemon.customPokemonData.ability,
    pokemon.customPokemonData.passive,
    pokemon.fusionCustomPokemonData.ability,
    pokemon.fusionCustomPokemonData.passive,
  ] = [build[2], build[3], build[4], build[5]];
  pokemon.customPokemonData.learnedAbilities = [build[2], build[3], build[4], build[5]];
  pokemon.generateName();
  pokemon.calculateStats();
  pokemon.generateAndPopulateMoveset(trainer.config.getDerivedType() === TrainerType.RIVAL);
  pokemon.hp = pokemon.getMaxHp();
}
