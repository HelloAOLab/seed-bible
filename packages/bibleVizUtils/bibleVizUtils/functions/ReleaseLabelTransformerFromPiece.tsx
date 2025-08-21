const {piece} = ThePageWithEditor;
const infoLabelTransformer = getBot(byTag("isInfoLabelTransformer", true), byTag("ownerBotId", getID(piece)), byTag('isInUse', true));
if(infoLabelTransformer) ObjectPooler.ReleaseObject({obj: infoLabelTransformer, tag: infoLabelTransformer.tags.poolTag});