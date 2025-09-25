/**
    * Triggers an OnStackBookInteracted event when the book's label has been interacted.
    * @example
    * book.OnLabelInteracted()
*/
shout("OnStackBookInteracted", {book: thisBot, typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.Tap});