const {sectionData, desiredPositionZ, dimension, duration, easing, speedMultiplier = 1, isInstantaneous} = that;

const {bibleData} = thisBot.GetDataChainFromParentDataIds({parentDataIds: sectionData.parentDataIds});
const sectionPosition = getBotPosition(sectionData.piece, dimension);
let nextPositionZ = desiredPositionZ;
const newSectionAnimations = []
const desiredSectionShadowFormOpacity = 0.2;

if(sectionData.isSplitIntoBooks)
{
    const activeBooksInsideSection = sectionData.childrenData.flat().filter((bookData) => {return bookData.isActive});
    let selectedBooksTotalHeight = 0;
    let selectedBooksTotalMargin = 0;
    const sectionShadowDesiredScales = {x: 0, y: 0, z: 0};
    const sectionShadowDesiredPositionZ = nextPositionZ + (!sectionData.piece.masks.isOnTheGround && sectionData.isInExplodedView && activeBooksInsideSection.length > 0 ? BibleVizUtils.Data.tags.StackSpacing.ExplodedViewSectionShadowPadding : 0);
    nextPositionZ += sectionData.piece.masks.isOnTheGround ? 0 : (sectionData.isInExplodedView ? BibleVizUtils.Data.tags.StackSpacing.ExplodedViewSectionPadding : BibleVizUtils.Data.tags.StackSpacing.BetweenBooks);
    for(const bookDataArr of sectionData.childrenData)
    {
        for(const bookData of bookDataArr)
        {
            const bookDataIndex = bookDataArr.indexOf(bookData);
            if(bookData.isActive)
            {
                const {absBookDesiredPosition, halfInitialBookScales, selectedBookHeight, marginToAdd, newBookAnimations} = await thisBot.HandleBookDataInStack({
                    dimension, 
                    duration,
                    easing,
                    bookData, 
                    bookDataArr, 
                    bookDataIndex, 
                    sectionData, 
                    selectedBooksTotalHeight, 
                    selectedBooksTotalMargin,
                    desiredPositionX: sectionPosition.x,
                    desiredPositionY: sectionPosition.y,
                    desiredPositionZ: nextPositionZ + (sectionData.piece.masks.isOnTheGround ? BibleVizUtils.Data.tags.StackSpacing.SectionShadowPadding : 0),
                    speedMultiplier,
                    isInstantaneous
                });
                
                newSectionAnimations.push(...newBookAnimations);
                const tempSectionShadowScales = {x: absBookDesiredPosition.x + halfInitialBookScales.x, y: absBookDesiredPosition.y + halfInitialBookScales.y};
                if(tempSectionShadowScales.x > sectionShadowDesiredScales.x) sectionShadowDesiredScales.x = tempSectionShadowScales.x;
                if(tempSectionShadowScales.y > sectionShadowDesiredScales.y) sectionShadowDesiredScales.y = tempSectionShadowScales.y;
                if(selectedBookHeight)
                {
                    selectedBooksTotalHeight += selectedBookHeight;
                    selectedBooksTotalMargin += marginToAdd;
                }
            }
        }

        if(bookDataArr.some((bookData) => {return bookData.isActive}) && !sectionData.isInExplodedView) nextPositionZ += bookDataArr.find((bookData) => {return bookData.isActive}).piece.tags.desiredScaleZ + BibleVizUtils.Data.tags.StackSpacing.BetweenBooks;
    }
    sectionShadowDesiredScales.x = (sectionShadowDesiredScales.x * 2) + BibleVizUtils.Data.tags.StackSpacing.SectionShadowPadding;
    sectionShadowDesiredScales.y = (sectionShadowDesiredScales.y * 2) + BibleVizUtils.Data.tags.StackSpacing.SectionShadowPadding;
    if(activeBooksInsideSection.length === 0)
    {
        sectionShadowDesiredScales.z = BibleVizUtils.Data.tags.StackPieceMeasurements.EmptySectionShadowScaleZ;
    }
    else if(activeBooksInsideSection.length > 0)
    {
        if(sectionData.isInExplodedView)
        {
            sectionShadowDesiredScales.z = sectionData.piece.tags.desiredExplodedViewScaleZ + (BibleVizUtils.Data.tags.StackSpacing.ExplodedViewSectionShadowPadding*2) + selectedBooksTotalHeight + selectedBooksTotalMargin;
        }
        else
        {
            const rawActiveBooksInsideSecion = sectionData.childrenData.filter((bookDataArr) => {return bookDataArr.some((bookData) => {return bookData.isActive})});
            const booksTotalScaleZ = rawActiveBooksInsideSecion.reduce((total, currentRawBookData) => {
                return total + currentRawBookData.find((bookData) => {return bookData.isActive}).piece.tags.desiredScaleZ
            }, 0)
            const tempSectionShadowScaleZ = booksTotalScaleZ + ((activeBooksInsideSection.length + 1) * BibleVizUtils.Data.tags.StackSpacing.BetweenBooks);
            sectionShadowDesiredScales.z = tempSectionShadowScaleZ > BibleVizUtils.Data.tags.StackPieceMeasurements.EmptySectionShadowScaleZ ? tempSectionShadowScaleZ : BibleVizUtils.Data.tags.StackPieceMeasurements.EmptySectionShadowScaleZ;
        }
    }
    if(sectionData.shadow)
    {
        // Modify section shadow scale and position
        const infoLabelTransformer = BibleVizUtils.Functions.GetCurrentInfoLabelTransformer(sectionData.shadow);
        const sectionShadowScales = BibleVizUtils.Functions.GetBotScales(sectionData.shadow);
        setTag(sectionData.shadow, "desiredPositionZ", sectionShadowDesiredPositionZ);
        setTag(sectionData.shadow, "desiredScaleZ", sectionShadowDesiredScales.z);
        if(infoLabelTransformer && !sectionData.isInExplodedView)
        {
            newSectionAnimations.push(infoLabelTransformer.Hide({speedMultiplier, isInstantaneous}).then(() => {ObjectPooler.ReleaseObject({obj: infoLabelTransformer, tag: infoLabelTransformer.tags.poolTag})}))
        }
        if(isInstantaneous)
        {
            setTagMask(sectionData.shadow, dimension + "Z", sectionShadowDesiredPositionZ);
            setTagMask(sectionData.shadow, "scaleX", sectionData.isInExplodedView && activeBooksInsideSection.length > 0 ? sectionShadowDesiredScales.x : sectionData.piece.tags.initialScaleX);
            setTagMask(sectionData.shadow, "scaleY", sectionData.isInExplodedView && activeBooksInsideSection.length > 0 ? sectionShadowDesiredScales.y : sectionData.piece.tags.initialScaleY);
            setTagMask(sectionData.shadow, "scaleZ", sectionShadowDesiredScales.z);
            if(!infoLabelTransformer && sectionData.isInExplodedView && !(bibleData && bibleData.bibleType === BibleVizUtils.Data.tags.BibleType.PlatformerGame))
            {
                const label = BibleVizUtils.Functions.CapitalizeFirstLetter(sectionData.piece.tags.sectionName.split("-").join(" "));
                const {infoLabelTransformer} = BibleVizUtils.Functions.GetLabelForPiece({
                    piece: sectionData.shadow, 
                    label, 
                    color: sectionData.highlightColor ?? sectionData.piece.tags.labelTextColor,
                    labelColor: "white", 
                    dimension,
                    labelPositioning: sectionData.piece.masks.isOnTheGround ? BibleVizUtils.Data.tags.LabelPositioning.Top : BibleVizUtils.Data.tags.LabelPositioning.RightSidedCorner,
                    isAnimatable: false,
                    targetOpacity: 0.5
                });

                newSectionAnimations.push(infoLabelTransformer.Show({speedMultiplier, isInstantaneous}));
            }
        }
        else
        {
            newSectionAnimations.push(
                animateTag(sectionData.shadow, {
                    fromValue: {
                        [dimension + "Z"]: sectionData.shadow.tags[dimension + "Z"],
                        scaleX: sectionShadowScales.x,
                        scaleY: sectionShadowScales.y,
                        scaleZ: sectionShadowScales.z,
                    },
                    toValue: {
                        [dimension + "Z"]: sectionShadowDesiredPositionZ,
                        scaleX: sectionData.isInExplodedView && activeBooksInsideSection.length > 0 ? sectionShadowDesiredScales.x : sectionData.piece.tags.initialScaleX,
                        scaleY: sectionData.isInExplodedView && activeBooksInsideSection.length > 0 ? sectionShadowDesiredScales.y : sectionData.piece.tags.initialScaleY,
                        scaleZ: sectionShadowDesiredScales.z,
                    },
                    duration,
                    easing
                }).then(() => {
                    if(!infoLabelTransformer && sectionData.isInExplodedView && !(bibleData && bibleData.bibleType === BibleVizUtils.Data.tags.BibleType.PlatformerGame))
                    {
                        const label = BibleVizUtils.Functions.CapitalizeFirstLetter(sectionData.piece.tags.sectionName.split("-").join(" "));
                        const {infoLabelTransformer} = BibleVizUtils.Functions.GetLabelForPiece({
                            piece: sectionData.shadow, 
                            label, 
                            color: sectionData.highlightColor ?? sectionData.piece.tags.labelTextColor,
                            labelColor: "white", 
                            dimension,
                            labelPositioning: sectionData.piece.masks.isOnTheGround ? BibleVizUtils.Data.tags.LabelPositioning.Top : BibleVizUtils.Data.tags.LabelPositioning.RightSidedCorner,
                            isAnimatable: false,
                            targetOpacity: 0.5
                        });

                        return infoLabelTransformer.Show({speedMultiplier, isInstantaneous});
                    }
                })
            )
        }
    }
    else
    {
        // Create section shadow
        
        const sectionShadow = ObjectPooler.GetObjectFromPool({tag: BibleVizUtils.Data.tags.ObjectPoolTags.SectionShadow});
        if(sectionShadow)
        {
            const sectionShadowMod = {
                transformer: sectionData.piece.tags.transformer,
                [dimension]: true,
                [dimension + "X"]: sectionPosition.x,
                [dimension + "Y"]: sectionPosition.y,
                [dimension + "Z"]: sectionShadowDesiredPositionZ,
                desiredPositionZ: sectionShadowDesiredPositionZ,
                scaleX: sectionData.isInExplodedView && activeBooksInsideSection.length > 0 ? sectionShadowDesiredScales.x : sectionData.piece.tags.initialScaleX,
                scaleY: sectionData.isInExplodedView && activeBooksInsideSection.length > 0 ? sectionShadowDesiredScales.y : sectionData.piece.tags.initialScaleY,
                scaleZ: sectionShadowDesiredScales.z,
                desiredScaleZ: sectionShadowDesiredScales,
                color: sectionData.highlightColor ?? sectionData.pieceInfo.color,
                sectionName: sectionData.piece.tags.sectionName,
                sectionDataId: sectionData.id
            }
            sectionShadow.OnSpawned?.({mod: sectionShadowMod})
            sectionData.shadow = sectionShadow;
        }
        if(isInstantaneous)
        {
            setTagMask(sectionShadow, "formOpacity", desiredSectionShadowFormOpacity);
            if(!(bibleData && bibleData.bibleType === BibleVizUtils.Data.tags.BibleType.PlatformerGame))
            {
                const label = BibleVizUtils.Functions.CapitalizeFirstLetter(sectionData.piece.tags.sectionName.split("-").join(" "));
                const {infoLabelTransformer} = BibleVizUtils.Functions.GetLabelForPiece({
                    piece: sectionShadow, 
                    label, 
                    color: sectionData.highlightColor ?? sectionData.piece.tags.labelTextColor,
                    labelColor: "white", 
                    dimension,
                    labelPositioning: sectionData.piece.masks.isOnTheGround ? BibleVizUtils.Data.tags.LabelPositioning.Top : BibleVizUtils.Data.tags.LabelPositioning.RightSidedCorner,
                    isAnimatable: false,
                    targetOpacity: 0.5
                })
                newSectionAnimations.push(
                    infoLabelTransformer.Show({isInstantaneous})
                )
            }
        }
        else
        {
            newSectionAnimations.push(
                animateTag(sectionShadow, "formOpacity", {
                    toValue: desiredSectionShadowFormOpacity,
                    duration,
                    easing
                }).then(() => {
                    if(!(bibleData && bibleData.bibleType === BibleVizUtils.Data.tags.BibleType.PlatformerGame))
                    {
                        const label = BibleVizUtils.Functions.CapitalizeFirstLetter(sectionData.piece.tags.sectionName.split("-").join(" "));
                        const {infoLabelTransformer} = BibleVizUtils.Functions.GetLabelForPiece({
                            piece: sectionShadow, 
                            label, 
                            color: sectionData.highlightColor ?? sectionData.piece.tags.labelTextColor,
                            labelColor: "white", 
                            dimension,
                            labelPositioning: sectionData.piece.masks.isOnTheGround ? BibleVizUtils.Data.tags.LabelPositioning.Top : BibleVizUtils.Data.tags.LabelPositioning.RightSidedCorner,
                            isAnimatable: false,
                            targetOpacity: 0.5
                        })
                        return infoLabelTransformer.Show();
                    }
                })
            )
        }
    }
    setTagMask(sectionData.shadow, "pointable", activeBooksInsideSection.length === 0);
    if(activeBooksInsideSection.length === 0) nextPositionZ = sectionShadowDesiredPositionZ + sectionShadowDesiredScales.z;
    else if(sectionData.isInExplodedView) nextPositionZ += (sectionData.piece.tags.desiredExplodedViewScaleZ + BibleVizUtils.Data.tags.StackSpacing.ExplodedViewSectionPadding + selectedBooksTotalHeight + selectedBooksTotalMargin);
}
else
{
    if(sectionData.isActive)
    {
        const isSectionBookDataInstance = sectionData instanceof StackSectionBookData || sectionData.constructor.name === "StackSectionBookData"; // instanceof not working the first time for some reason so checking by name;
        if(isSectionBookDataInstance)
        {
            const {newBookAnimations} = await thisBot.HandleBookDataInStack({
                dimension,
                duration,
                bookData: sectionData,
                isInstantaneous
            });
            newSectionAnimations.push(...newBookAnimations);
        }
        else
        {
            const sectionCurrentScales = BibleVizUtils.Functions.GetBotScales(sectionData.piece);
            const sectionDesiredScales = new Vector3(BibleVizUtils.Data.tags.StackPieceMeasurements.SectionScales.x, BibleVizUtils.Data.tags.StackPieceMeasurements.SectionScales.y, sectionData.piece.tags.desiredScaleZ)
            const setScaleX = sectionCurrentScales.x != sectionDesiredScales.x;
            const setScaleY = sectionCurrentScales.y != sectionDesiredScales.y;
            const setScaleZ = sectionCurrentScales.z != sectionDesiredScales.z;
            const setFormOpacity = sectionData.piece.tags.formOpacity != sectionData.piece.tags.unhoveredOpacity;
            if(isInstantaneous)
            {
                if(setScaleX) setTagMask(sectionData.piece, "scaleX", sectionDesiredScales.x)
                if(setScaleY) setTagMask(sectionData.piece, "scaleY", sectionDesiredScales.y)
                if(setScaleZ) setTagMask(sectionData.piece, "scaleZ", sectionDesiredScales.z)
                if(setFormOpacity) setTagMask(sectionData.piece, "formOpacity", sectionData.piece.tags.unhoveredOpacity)
            }
            else
            {
                newSectionAnimations.push(animateTag(sectionData.piece, {
                    fromValue: {
                        scaleX: setScaleX ? sectionCurrentScales.x : null,
                        scaleY: setScaleY ? sectionCurrentScales.y : null,
                        scaleZ: setScaleZ ? sectionCurrentScales.z : null,
                        formOpacity: setFormOpacity ? sectionData.piece.tags.formOpacity : null
                    },
                    toValue: {
                        scaleX: setScaleX ? sectionDesiredScales.x : null,
                        scaleY: setScaleY ? sectionDesiredScales.y : null,
                        scaleZ: setScaleZ ? sectionDesiredScales.z : null,
                        formOpacity: setFormOpacity ? sectionData.piece.tags.unhoveredOpacity : null
                    },
                    duration,
                    easing
                }));
            }
        }
        setTag(sectionData.piece, "desiredPositionZ", nextPositionZ);
        if(isInstantaneous) setTagMask(sectionData.piece, dimension + "Z", nextPositionZ)
        else newSectionAnimations.push(animateTag(sectionData.piece, dimension + "Z", {
            toValue: nextPositionZ,
            duration,
            easing
        }));
        nextPositionZ += sectionData.piece.tags.desiredScaleZ;
    }
}
const sectionDeltaPositionZ = nextPositionZ - desiredPositionZ;

return {sectionDeltaPositionZ, newSectionAnimations};