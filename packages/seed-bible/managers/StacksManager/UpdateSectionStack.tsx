/**
 * Updates the position and animations of a specific section within the stack.
 * Handles animations and positioning adjustments for the section's elements based on its current state and dimension.
 *
 * @param {Object} that - The object containing `sectionData`.
 * @param {SectionData} that.sectionData - The section data to be updated within the stack.
 * @returns {Promise<boolean>} Resolves once all animations are completed.
 *
 * @example
 * StacksManager.UpdateSectionStack({ sectionData: someSectionData });
 */

const {sectionData, isInstantaneous} = that;
if(!sectionData.isActive) return false;
const dimension = os.getCurrentDimension();
const duration = isInstantaneous ? 0 : 0.5;
const easing = {type: "sinusoidal", mode: "inout"};
const sectionPosition = getBotPosition(sectionData.element, dimension);
const animations = [];

const {newSectionAnimations} = HandleSectionDataInStack({isInstantaneous, sectionData, desiredPositionZ: sectionPosition.z, dimension, duration, easing})
animations.push(...newSectionAnimations);

await Promise.allSettled(animations);

return true;