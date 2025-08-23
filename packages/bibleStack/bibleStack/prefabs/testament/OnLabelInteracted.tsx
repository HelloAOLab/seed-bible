/**
    * Triggers an OnStackSectionInteracted event when the testament's label has been interacted.
    * @example
    * testament.OnLabelInteracted()
*/

shout("OnStackTestamentInteracted", {testament: thisBot, typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.Tap});