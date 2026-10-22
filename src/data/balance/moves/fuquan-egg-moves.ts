import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";

export const fuquanEggMoves = {
  [SpeciesId.TUBAOQIU]: [MoveId.PRECIPICE_BLADES, MoveId.ICE_BEAM, MoveId.SLACK_OFF, MoveId.FOLLOW_ME],
} as const satisfies Partial<Record<SpeciesId, [MoveId, MoveId, MoveId, MoveId]>>;
