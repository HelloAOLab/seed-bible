/**
    * Retrieves the label elements associated with this info label transformer.
    * @returns {Object} - Contains `infoLabel` and `infoLabelTail`, representing the main and tail labels respectively.
    * @example
    * const { infoLabel, infoLabelTail, infoLabelUsersColor} = infoLabelTransformer.GetLabelElements();
    */

const infoLabel = getBot(byTag("isInfoLabel", true), byTag("transformer", getID(thisBot)), byTag('isInUse', true));
const infoLabelTail = getBot(byTag("isInfoLabelTail", true), byTag("transformer", getID(thisBot)), byTag('isInUse', true));
const infoLabelDate = getBot(byTag("isInfoLabelDate", true), byTag("transformer", getID(thisBot)), byTag('isInUse', true));
const infoLabelUsersColor = getBots(byTag("isUserColor", true), byTag("transformer", getID(thisBot)), byTag('isInUse', true))
return {infoLabel, infoLabelTail, infoLabelDate, infoLabelUsersColor};