/**
    * Triggers an OnBookInteracted event when the book's label has been interacted.
    * @example
    * book.OnLabelInteracted()
*/
shout("OnBookInteracted", {book: thisBot, typeOfInteraction: StackElementInteractionType.Tap});