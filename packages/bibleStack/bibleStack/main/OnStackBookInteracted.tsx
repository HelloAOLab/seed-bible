/**
    * Handles interaction with a book by delegating the action to the book interaction handler.
    *
    * @param {Object} that - The context object containing interaction details.
    * @returns {function} - Returns the function HandleBookInteraction of thisBot
    * @example
    * shout("OnStackBookInteracted", {book: someBot, typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.Tap});
*/

return thisBot.HandleBookInteraction(that);