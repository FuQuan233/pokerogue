import { allMoves } from "#data/data-lists";
import { getTrainerRole, getTrainerStrength } from "#data/trainer-strength";
import { getTypeDamageMultiplier } from "#data/type";
import { MoveCategory } from "#enums/move-category";
import { MoveId } from "#enums/move-id";
import { PokemonType } from "#enums/pokemon-type";
import type { Pokemon } from "#field/pokemon";

const RECOVERY = new Set([
  MoveId.RECOVER,
  MoveId.ROOST,
  MoveId.SOFT_BOILED,
  MoveId.SLACK_OFF,
  MoveId.MOONLIGHT,
  MoveId.SYNTHESIS,
  MoveId.SHORE_UP,
  MoveId.STRENGTH_SAP,
]);
const CONTROL = new Set([
  MoveId.HAZE,
  MoveId.CLEAR_SMOG,
  MoveId.ROAR,
  MoveId.WHIRLWIND,
  MoveId.TAUNT,
  MoveId.ENCORE,
  MoveId.THUNDER_WAVE,
  MoveId.WILL_O_WISP,
]);
const SUPPORT = new Set([
  MoveId.STEALTH_ROCK,
  MoveId.SPIKES,
  MoveId.STICKY_WEB,
  MoveId.REFLECT,
  MoveId.LIGHT_SCREEN,
  MoveId.TAILWIND,
]);
const SETUP = new Set([
  MoveId.SWORDS_DANCE,
  MoveId.NASTY_PLOT,
  MoveId.DRAGON_DANCE,
  MoveId.QUIVER_DANCE,
  MoveId.CALM_MIND,
  MoveId.BULK_UP,
  MoveId.SHELL_SMASH,
]);

/** Fill legal generated pools with complementary moves; existing signature/STAB slots are retained. */
export function chooseTrainerMovesetSlot(pokemon: Pokemon, pool: [MoveId, number][], fallback: MoveId): MoveId {
  const profile = pokemon.hasTrainer() ? getTrainerStrength() : null;
  if (!profile?.boss || pool.length === 0) {
    return fallback;
  }
  const existing = pokemon.moveset.map(m => m.getMove());
  const attacks = existing.filter(m => m.category !== MoveCategory.STATUS);
  const statuses = existing.length - attacks.length;
  const role = getTrainerRole(pokemon);
  const ownTypes = pokemon.getTypes();
  const weaknesses = Array.from({ length: PokemonType.FAIRY + 1 }, (_, i) => i as PokemonType).filter(
    type => ownTypes.reduce((v, own) => v * getTypeDamageMultiplier(type, own), 1) > 1,
  );
  const score = ([id, weight]: [MoveId, number]) => {
    const move = allMoves[id];
    let value = Math.log1p(weight);
    if (move.category === MoveCategory.STATUS) {
      if (statuses >= (role === "tank" ? 2 : 1)) {
        return value - 200;
      }
      if (role === "tank" && RECOVERY.has(id) && !existing.some(m => RECOVERY.has(m.id))) {
        value += 140;
      } else if (CONTROL.has(id) || (role === "tank" && SUPPORT.has(id))) {
        value += 80;
      } else if (role !== "tank" && SETUP.has(id)) {
        value += 70;
      }
      if (attacks.length === 0) {
        value -= 200;
      }
    } else {
      value += 40;
      if (!attacks.some(m => m.type === move.type)) {
        value += 40;
        if (weaknesses.some(type => getTypeDamageMultiplier(move.type, type) > 1)) {
          value += 35;
        }
      }
      if (move.priority > 0 && !attacks.some(m => m.priority > 0)) {
        value += 55;
      }
      if (attacks.length >= 3) {
        value -= 100;
      }
    }
    return value;
  };
  return [...pool].sort((a, b) => score(b) - score(a) || a[0] - b[0])[0][0];
}
