const chapterData = scriptureMap3DManager.GetPieceData({piece: thisBot})
return getBots(byTag("isElementUserColor", true), byTag("ownerDataId", Number(chapterData.id)), byTag("isInUse", true));