/**
    * Triggers an OnStackSectionInteracted event when the sectionShadow's label has been interacted.
    * @example
    * sectionShadow.OnLabelInteracted()
*/

shout("OnSectionShadowInteracted", {sectionShadow: thisBot, typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.Tap});