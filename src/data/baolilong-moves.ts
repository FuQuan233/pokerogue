import { speciesDataRegistry } from "#app/global-species-data-registry";
import { speciesEggMoves } from "#balance/egg-moves";
import { tmPoolTiers } from "#balance/tm-pool-tiers";
import { allMoves } from "#data/data-lists";
import { ModifierTier } from "#enums/modifier-tier";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesId } from "#enums/species-id";

/** Run after moves initialize so the pool follows the actual move types in this build. */
export function initBaolilongTms(): void {
  const source = speciesDataRegistry.data[SpeciesId.GYARADOS];
  const tms = new Set(speciesDataRegistry.getTms(SpeciesId.GYARADOS));
  for (const form of source.species.forms) {
    speciesDataRegistry.getTms(SpeciesId.GYARADOS, form.formKey).forEach(move => tms.add(move));
  }
  for (const moves of [source.levelMoves, ...Object.values(source.formLevelMoves ?? {})]) {
    moves.forEach(([, move]) => tms.add(move));
  }
  let prevolution = speciesDataRegistry.getPrevolution(SpeciesId.GYARADOS);
  while (prevolution !== null) {
    speciesDataRegistry.getLevelMoves(prevolution).forEach(([, move]) => tms.add(move));
    prevolution = speciesDataRegistry.getPrevolution(prevolution);
  }
  // Gyarados inherits its egg moves from Magikarp.
  speciesEggMoves[speciesDataRegistry.getStarter(SpeciesId.GYARADOS)].forEach(move => tms.add(move));
  allMoves
    .filter(move => move.type === PokemonType.WATER || move.type === PokemonType.ICE)
    .forEach(move => tms.add(move.id));
  speciesDataRegistry.data[SpeciesId.BAOLILONG].tms = [...tms];
  for (const move of tms) {
    tmPoolTiers[move] ??= ModifierTier.ULTRA;
  }
}
