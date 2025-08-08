const mapChapterData = MapsManager.GetMapElementData({element: thisBot})
return getBots(byTag("isElementUserColor", true), byTag("ownerDataId", Number(mapChapterData.id)), byTag("isInUse", true));