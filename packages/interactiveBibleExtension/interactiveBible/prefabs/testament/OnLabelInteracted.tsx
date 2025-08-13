/**
    * Triggers an OnSectionInteracted event when the testament's label has been interacted.
    * @example
    * testament.OnLabelInteracted()
*/

shout("OnTestamentInteracted", {testament: thisBot, typeOfInteraction: StackElementInteractionType.Tap});