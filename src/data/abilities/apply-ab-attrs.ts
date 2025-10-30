import { globalScene } from "#app/global-scene";
import { allAbilities } from "#data/data-lists";
import { AbilityId } from "#enums/ability-id";
import type { AbAttrBaseParams, AbAttrParamMap, AbAttrString, CallableAbAttrString } from "#types/ability-types";

function applySingleAbAttrs<T extends AbAttrString>(
  attrType: T,
  params: AbAttrParamMap[T],
  gainedMidTurn = false,
  messages: string[] = [],
) {
  const { simulated = false, passive = false, pokemon } = params;
  if (!pokemon.canApplyAbility(passive) || (passive && pokemon.getPassiveAbility().id === pokemon.getAbility().id)) {
    return;
  }

  const ability = passive ? pokemon.getPassiveAbility() : pokemon.getAbility();
  const attrs = ability.getAttrs(attrType);
  if (gainedMidTurn && attrs.some(attr => attr.is("PostSummonAbAttr") && !attr.shouldActivateOnGain())) {
    return;
  }

  for (const attr of attrs) {
    const condition = attr.getCondition();
    // We require an `as any` cast to suppress an error about the `params` type not being assignable to
    // the type of the argument expected by `attr.canApply()`. This is OK, because we know that
    // `attr` is an instance of the `attrType` class provided to the method, and typescript _will_ check
    // that the `params` object has the correct properties for that class at the callsites.
    if ((condition && !condition(pokemon)) || !attr.canApply(params as any)) {
      continue;
    }

    let abShown = false;

    if (attr.showAbility && !simulated) {
      globalScene.phaseManager.queueAbilityDisplay(pokemon, passive, true);
      abShown = true;
    }

    const message = attr.getTriggerMessage(params as any, ability.name);
    if (message) {
      if (!simulated) {
        globalScene.phaseManager.queueMessage(message);
      }
      // TODO: Should messages be added to the array if they aren't actually shown?
      messages.push(message);
    }
    // The `as any` cast here uses the same reasoning as above.
    attr.apply(params as any);

    if (abShown) {
      globalScene.phaseManager.queueAbilityDisplay(pokemon, passive, false);
    }

    if (!simulated) {
      pokemon.waveData.abilitiesApplied.add(ability.id);
    }
  }
}

function applyAbAttrsInternal<T extends CallableAbAttrString>(
  attrType: T,
  params: AbAttrParamMap[T],
  messages: string[] = [],
  gainedMidTurn = false,
) {
  // If the pokemon is not defined, no ability attributes to be applied.
  // TODO: Evaluate whether this check is even necessary anymore
  if (!params.pokemon) {
    return;
  }
  if (params.passive !== undefined) {
    applySingleAbAttrs(attrType, params, gainedMidTurn, messages);
    return;
  }

  // For fusion Pokemon, skip the standard main/passive loop and handle all 4 abilities below
  // to prevent duplicate triggering of base Pokemon A's abilities
  if (!params.pokemon.isFusion()) {
    for (const passive of [false, true]) {
      params.passive = passive;
      applySingleAbAttrs(attrType, params, gainedMidTurn, messages);
    }
  }

  // For fusion Pokemon, apply abilities from base Pokemon A and fusion Pokemon B
  if (params.pokemon.isFusion()) {
    const { simulated = false } = params;

    // Apply base Pokemon A's main ability
    const baseAbilityId = params.pokemon.getSpeciesForm().getAbility(params.pokemon.abilityIndex);
    if (baseAbilityId !== AbilityId.NONE && params.pokemon.canApplyAbility()) {
      const baseAbility = allAbilities[baseAbilityId];
      const attrs = baseAbility.getAttrs(attrType);
      if (!(gainedMidTurn && attrs.some(attr => attr.is("PostSummonAbAttr") && !attr.shouldActivateOnGain()))) {
        for (const attr of attrs) {
          const condition = attr.getCondition();
          if ((condition && !condition(params.pokemon)) || !attr.canApply(params as any)) {
            continue;
          }

          let abShown = false;
          if (attr.showAbility && !simulated) {
            globalScene.phaseManager.queueAbilityDisplay(params.pokemon, false, true, baseAbility.name);
            abShown = true;
          }

          const message = attr.getTriggerMessage(params as any, baseAbility.name);
          if (message) {
            if (!simulated) {
              globalScene.phaseManager.queueMessage(message);
            }
            messages.push(message);
          }

          attr.apply(params as any);

          if (abShown) {
            globalScene.phaseManager.queueAbilityDisplay(params.pokemon, false, false);
          }

          if (!simulated) {
            params.pokemon.waveData.abilitiesApplied.add(baseAbility.id);
          }
        }
      }
    }

    // Apply base Pokemon A's passive ability
    const basePassiveId = params.pokemon.species.getPassiveAbility(params.pokemon.formIndex);
    if (basePassiveId !== AbilityId.NONE && params.pokemon.hasPassive() && params.pokemon.canApplyAbility(true)) {
      const basePassive = allAbilities[basePassiveId];
      const attrs = basePassive.getAttrs(attrType);
      if (!(gainedMidTurn && attrs.some(attr => attr.is("PostSummonAbAttr") && !attr.shouldActivateOnGain()))) {
        for (const attr of attrs) {
          const condition = attr.getCondition();
          if ((condition && !condition(params.pokemon)) || !attr.canApply(params as any)) {
            continue;
          }

          let abShown = false;
          if (attr.showAbility && !simulated) {
            globalScene.phaseManager.queueAbilityDisplay(params.pokemon, true, true, basePassive.name);
            abShown = true;
          }

          const message = attr.getTriggerMessage(params as any, basePassive.name);
          if (message) {
            if (!simulated) {
              globalScene.phaseManager.queueMessage(message);
            }
            messages.push(message);
          }

          attr.apply(params as any);

          if (abShown) {
            globalScene.phaseManager.queueAbilityDisplay(params.pokemon, true, false);
          }

          if (!simulated) {
            params.pokemon.waveData.abilitiesApplied.add(basePassive.id);
          }
        }
      }
    }

    // Apply fusion Pokemon B's main ability
    const fusionAbilityId = params.pokemon.getFusionSpeciesForm().getAbility(params.pokemon.fusionAbilityIndex);
    if (fusionAbilityId !== AbilityId.NONE && params.pokemon.canApplyAbility()) {
      const fusionAbility = allAbilities[fusionAbilityId];
      const attrs = fusionAbility.getAttrs(attrType);
      if (!(gainedMidTurn && attrs.some(attr => attr.is("PostSummonAbAttr") && !attr.shouldActivateOnGain()))) {
        for (const attr of attrs) {
          const condition = attr.getCondition();
          if ((condition && !condition(params.pokemon)) || !attr.canApply(params as any)) {
            continue;
          }

          let abShown = false;
          if (attr.showAbility && !simulated) {
            globalScene.phaseManager.queueAbilityDisplay(params.pokemon, false, true, fusionAbility.name);
            abShown = true;
          }

          const message = attr.getTriggerMessage(params as any, fusionAbility.name);
          if (message) {
            if (!simulated) {
              globalScene.phaseManager.queueMessage(message);
            }
            messages.push(message);
          }

          attr.apply(params as any);

          if (abShown) {
            globalScene.phaseManager.queueAbilityDisplay(params.pokemon, false, false);
          }

          if (!simulated) {
            params.pokemon.waveData.abilitiesApplied.add(fusionAbility.id);
          }
        }
      }
    }

    // Apply fusion Pokemon B's passive ability
    const fusionPassiveId = params.pokemon.fusionSpecies!.getPassiveAbility(params.pokemon.fusionFormIndex);
    if (fusionPassiveId !== AbilityId.NONE && params.pokemon.hasPassive() && params.pokemon.canApplyAbility(true)) {
      const fusionPassive = allAbilities[fusionPassiveId];
      const attrs = fusionPassive.getAttrs(attrType);
      if (!(gainedMidTurn && attrs.some(attr => attr.is("PostSummonAbAttr") && !attr.shouldActivateOnGain()))) {
        for (const attr of attrs) {
          const condition = attr.getCondition();
          if ((condition && !condition(params.pokemon)) || !attr.canApply(params as any)) {
            continue;
          }

          let abShown = false;
          if (attr.showAbility && !simulated) {
            globalScene.phaseManager.queueAbilityDisplay(params.pokemon, true, true, fusionPassive.name);
            abShown = true;
          }

          const message = attr.getTriggerMessage(params as any, fusionPassive.name);
          if (message) {
            if (!simulated) {
              globalScene.phaseManager.queueMessage(message);
            }
            messages.push(message);
          }

          attr.apply(params as any);

          if (abShown) {
            globalScene.phaseManager.queueAbilityDisplay(params.pokemon, true, false);
          }

          if (!simulated) {
            params.pokemon.waveData.abilitiesApplied.add(fusionPassive.id);
          }
        }
      }
    }
  }

  // We need to restore passive to its original state in the case that it was undefined on entry
  // this is necessary in case this method is called with an object that is reused.
  params.passive = undefined;
}

/**
 * @param attrType - The type of the ability attribute to apply. (note: may not be any attribute that extends PostSummonAbAttr)
 * @param params - The parameters to pass to the ability attribute's apply method
 * @param messages - An optional array to which ability trigger messges will be added
 */
export function applyAbAttrs<T extends CallableAbAttrString>(
  attrType: T,
  params: AbAttrParamMap[T],
  messages?: string[],
): void {
  applyAbAttrsInternal(attrType, params, messages);
}

// TODO: Improve the type signatures of the following methods / refactor the apply methods

/**
 * Applies abilities when they become active mid-turn (ability switch)
 *
 * Ignores passives as they don't change and shouldn't be reapplied when main abilities change
 */
export function applyOnGainAbAttrs(params: AbAttrBaseParams): void {
  applySingleAbAttrs("PostSummonAbAttr", params, true);

  // For fusion Pokemon, also apply abilities from base Pokemon A and fusion Pokemon B
  if (params.pokemon.isFusion() && params.passive === undefined) {
    const { simulated = false, pokemon } = params;

    // Apply base Pokemon A's main ability (PostSummonAbAttr)
    const baseAbilityId = pokemon.getSpeciesForm().getAbility(pokemon.abilityIndex);
    if (baseAbilityId !== AbilityId.NONE && pokemon.canApplyAbility()) {
      const baseAbility = allAbilities[baseAbilityId];
      const attrs = baseAbility.getAttrs("PostSummonAbAttr");
      if (!attrs.some(attr => !attr.shouldActivateOnGain())) {
        for (const attr of attrs) {
          const condition = attr.getCondition();
          if ((condition && !condition(pokemon)) || !attr.canApply(params as any)) {
            continue;
          }

          let abShown = false;
          if (attr.showAbility && !simulated) {
            globalScene.phaseManager.queueAbilityDisplay(pokemon, false, true, baseAbility.name);
            abShown = true;
          }

          const message = attr.getTriggerMessage(params as any, baseAbility.name);
          if (message && !simulated) {
            globalScene.phaseManager.queueMessage(message);
          }

          attr.apply(params as any);

          if (abShown) {
            globalScene.phaseManager.queueAbilityDisplay(pokemon, false, false);
          }

          if (!simulated) {
            pokemon.waveData.abilitiesApplied.add(baseAbility.id);
          }
        }
      }
    }

    // Apply base Pokemon A's passive ability (PostSummonAbAttr)
    const basePassiveId = pokemon.species.getPassiveAbility(pokemon.formIndex);
    if (basePassiveId !== AbilityId.NONE && pokemon.hasPassive() && pokemon.canApplyAbility(true)) {
      const basePassive = allAbilities[basePassiveId];
      const attrs = basePassive.getAttrs("PostSummonAbAttr");
      if (!attrs.some(attr => !attr.shouldActivateOnGain())) {
        for (const attr of attrs) {
          const condition = attr.getCondition();
          if ((condition && !condition(pokemon)) || !attr.canApply(params as any)) {
            continue;
          }

          let abShown = false;
          if (attr.showAbility && !simulated) {
            globalScene.phaseManager.queueAbilityDisplay(pokemon, true, true, basePassive.name);
            abShown = true;
          }

          const message = attr.getTriggerMessage(params as any, basePassive.name);
          if (message && !simulated) {
            globalScene.phaseManager.queueMessage(message);
          }

          attr.apply(params as any);

          if (abShown) {
            globalScene.phaseManager.queueAbilityDisplay(pokemon, true, false);
          }

          if (!simulated) {
            pokemon.waveData.abilitiesApplied.add(basePassive.id);
          }
        }
      }
    }

    // Apply fusion Pokemon B's main ability (PostSummonAbAttr)
    const fusionAbilityId = pokemon.getFusionSpeciesForm().getAbility(pokemon.fusionAbilityIndex);
    if (fusionAbilityId !== AbilityId.NONE && pokemon.canApplyAbility()) {
      const fusionAbility = allAbilities[fusionAbilityId];
      const attrs = fusionAbility.getAttrs("PostSummonAbAttr");
      if (!attrs.some(attr => !attr.shouldActivateOnGain())) {
        for (const attr of attrs) {
          const condition = attr.getCondition();
          if ((condition && !condition(pokemon)) || !attr.canApply(params as any)) {
            continue;
          }

          let abShown = false;
          if (attr.showAbility && !simulated) {
            globalScene.phaseManager.queueAbilityDisplay(pokemon, false, true, fusionAbility.name);
            abShown = true;
          }

          const message = attr.getTriggerMessage(params as any, fusionAbility.name);
          if (message && !simulated) {
            globalScene.phaseManager.queueMessage(message);
          }

          attr.apply(params as any);

          if (abShown) {
            globalScene.phaseManager.queueAbilityDisplay(pokemon, false, false);
          }

          if (!simulated) {
            pokemon.waveData.abilitiesApplied.add(fusionAbility.id);
          }
        }
      }
    }

    // Apply fusion Pokemon B's passive ability (PostSummonAbAttr)
    const fusionPassiveId = pokemon.fusionSpecies!.getPassiveAbility(pokemon.fusionFormIndex);
    if (fusionPassiveId !== AbilityId.NONE && pokemon.hasPassive() && pokemon.canApplyAbility(true)) {
      const fusionPassive = allAbilities[fusionPassiveId];
      const attrs = fusionPassive.getAttrs("PostSummonAbAttr");
      if (!attrs.some(attr => !attr.shouldActivateOnGain())) {
        for (const attr of attrs) {
          const condition = attr.getCondition();
          if ((condition && !condition(pokemon)) || !attr.canApply(params as any)) {
            continue;
          }

          let abShown = false;
          if (attr.showAbility && !simulated) {
            globalScene.phaseManager.queueAbilityDisplay(pokemon, true, true, fusionPassive.name);
            abShown = true;
          }

          const message = attr.getTriggerMessage(params as any, fusionPassive.name);
          if (message && !simulated) {
            globalScene.phaseManager.queueMessage(message);
          }

          attr.apply(params as any);

          if (abShown) {
            globalScene.phaseManager.queueAbilityDisplay(pokemon, true, false);
          }

          if (!simulated) {
            pokemon.waveData.abilitiesApplied.add(fusionPassive.id);
          }
        }
      }
    }
  }
}

/**
 * Applies ability attributes which activate when the ability is lost or suppressed (i.e. primal weather)
 */
export function applyOnLoseAbAttrs(params: AbAttrBaseParams): void {
  applySingleAbAttrs("PreLeaveFieldAbAttr", params, true);
  applySingleAbAttrs("IllusionBreakAbAttr", params, true);

  // For fusion Pokemon, also apply abilities from base Pokemon A and fusion Pokemon B
  if (params.pokemon.isFusion() && params.passive === undefined) {
    const { pokemon } = params;

    // Apply base Pokemon A's main ability (PreLeaveFieldAbAttr and IllusionBreakAbAttr)
    const baseAbilityId = pokemon.getSpeciesForm().getAbility(pokemon.abilityIndex);
    if (baseAbilityId !== AbilityId.NONE && pokemon.canApplyAbility()) {
      const baseAbility = allAbilities[baseAbilityId];

      for (const attrType of ["PreLeaveFieldAbAttr", "IllusionBreakAbAttr"] as const) {
        const attrs = baseAbility.getAttrs(attrType);
        for (const attr of attrs) {
          const condition = attr.getCondition();
          if ((condition && !condition(pokemon)) || !attr.canApply(params as any)) {
            continue;
          }

          attr.apply(params as any);
        }
      }
    }

    // Apply base Pokemon A's passive ability (PreLeaveFieldAbAttr and IllusionBreakAbAttr)
    const basePassiveId = pokemon.species.getPassiveAbility(pokemon.formIndex);
    if (basePassiveId !== AbilityId.NONE && pokemon.hasPassive() && pokemon.canApplyAbility(true)) {
      const basePassive = allAbilities[basePassiveId];

      for (const attrType of ["PreLeaveFieldAbAttr", "IllusionBreakAbAttr"] as const) {
        const attrs = basePassive.getAttrs(attrType);
        for (const attr of attrs) {
          const condition = attr.getCondition();
          if ((condition && !condition(pokemon)) || !attr.canApply(params as any)) {
            continue;
          }

          attr.apply(params as any);
        }
      }
    }

    // Apply fusion Pokemon B's main ability (PreLeaveFieldAbAttr and IllusionBreakAbAttr)
    const fusionAbilityId = pokemon.getFusionSpeciesForm().getAbility(pokemon.fusionAbilityIndex);
    if (fusionAbilityId !== AbilityId.NONE && pokemon.canApplyAbility()) {
      const fusionAbility = allAbilities[fusionAbilityId];

      for (const attrType of ["PreLeaveFieldAbAttr", "IllusionBreakAbAttr"] as const) {
        const attrs = fusionAbility.getAttrs(attrType);
        for (const attr of attrs) {
          const condition = attr.getCondition();
          if ((condition && !condition(pokemon)) || !attr.canApply(params as any)) {
            continue;
          }

          attr.apply(params as any);
        }
      }
    }

    // Apply fusion Pokemon B's passive ability (PreLeaveFieldAbAttr and IllusionBreakAbAttr)
    const fusionPassiveId = pokemon.fusionSpecies!.getPassiveAbility(pokemon.fusionFormIndex);
    if (fusionPassiveId !== AbilityId.NONE && pokemon.hasPassive() && pokemon.canApplyAbility(true)) {
      const fusionPassive = allAbilities[fusionPassiveId];

      for (const attrType of ["PreLeaveFieldAbAttr", "IllusionBreakAbAttr"] as const) {
        const attrs = fusionPassive.getAttrs(attrType);
        for (const attr of attrs) {
          const condition = attr.getCondition();
          if ((condition && !condition(pokemon)) || !attr.canApply(params as any)) {
            continue;
          }

          attr.apply(params as any);
        }
      }
    }
  }
}
