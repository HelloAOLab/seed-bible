/**
    * Called whenever a section shadow is interacted by clicking on its info label
    * It is in charge of deselecting the section shadow's owner section
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.sectionShadow - The section shadow that has been interacted
    * @param {String} that.typeOfInteraction - Represents the type of interaction. Possible values can be found at globalThis.StackElementInteractionType
    * @example
    * StacksManager.HandleSectionShadowInteraction({sectionShadow: someSectionShadow, typeOfInteraction: StackElementInteractionType.Tap});
*/

const {sectionShadow, typeOfInteraction} = that;
const sectionData = thisBot.vars.sectionsData.find((data) => {return data.isActive && data.id == sectionShadow.tags.sectionDataId})
if(!sectionData || !sectionData.isActive || thisBot.masks.isBibleAnimating || thisBot.masks.isASectionMakingTourGuide) return;

switch(typeOfInteraction)
{
    case StackElementInteractionType.Tap: 
    {
        thisBot.DeselectSection({sectionData});
    }
    break;
    default: break;
}