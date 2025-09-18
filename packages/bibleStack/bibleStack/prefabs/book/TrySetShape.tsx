/**
    * This tag try to set the book shape into the one passed as an argument
    * @param {Object} that - Object that contains important data for the function
    * @param {String} that.shape - The type of shape the book attempts to set its shape. Allowed types of shape can be found at globalThis.BookShapeType
    * @param {Number} that.duration? - Is optional and is a custom duration for the animation
    * @example
    * thisBot.TrySetShape({shape: BibleVizUtils.Data.tags.BookShapeType.Regular})
*/

const dimension = os.getCurrentDimension();
const {shape, speedMultiplier = 1, isInstantaneous = false} = that;
let {duration = 0.5} = that;
duration = duration/speedMultiplier;
const bookData = BibleStackManager.GetPieceData({piece: thisBot});
const {sectionData} = BibleStackManager.GetDataChainFromParentDataIds({parentDataIds: bookData.parentDataIds});
const prevShape = bookData.currentShape;
if(shape === bookData.currentShape) return false;
const bookScales = BibleVizUtils.Functions.GetBotScales(thisBot);
const easing = {type: "sinusoidal", mode: "inout"};
const selectedOpacity = 0;
const infoLabelTransformer = BibleVizUtils.Functions.GetCurrentInfoLabelTransformer(thisBot)
bookData.currentShape = shape;
switch(shape)
{
    case BibleVizUtils.Data.tags.BookShapeType.ExplodedView:
    {
        setTagMask(thisBot, "color", BibleVizUtils.Data.masks.isInHistoryMode ? BibleVizUtils.Functions.GetHistoryColor({piece: thisBot}) : (bookData.highlightColor ?? thisBot.tags.initialColor))
        if(isInstantaneous)
        {
            if(prevShape !== BibleVizUtils.Data.tags.BookShapeType.Regular) setTagMask(thisBot, "formOpacity", thisBot.tags.unhoveredOpacity)
            setTagMask(thisBot, "scaleX", thisBot.tags.explodedViewCustomScale ? (thisBot.tags.explodedViewCustomScale.x * sectionData.piece.tags.initialScaleX) : thisBot.tags.initialScaleX)
            setTagMask(thisBot, "scaleY", thisBot.tags.explodedViewCustomScale ? (thisBot.tags.explodedViewCustomScale.y * sectionData.piece.tags.initialScaleY) : thisBot.tags.initialScaleY)
            setTagMask(thisBot, "scaleZ", thisBot.tags.desiredScaleZ)
        }
        else
        {
            await Promise.allSettled([
                animateTag(thisBot, {
                    fromValue: {
                        formOpacity: prevShape !== BibleVizUtils.Data.tags.BookShapeType.Regular ? thisBot.tags.formOpacity : null,
                        scaleX: bookScales.x,
                        scaleY: bookScales.y,
                        scaleZ: bookScales.z
                    },
                    toValue: {
                        formOpacity: prevShape !== BibleVizUtils.Data.tags.BookShapeType.Regular ? thisBot.tags.unhoveredOpacity : null,
                        scaleX: thisBot.tags.explodedViewCustomScale ? (thisBot.tags.explodedViewCustomScale.x * sectionData.piece.tags.initialScaleX) : thisBot.tags.initialScaleX,
                        scaleY: thisBot.tags.explodedViewCustomScale ? (thisBot.tags.explodedViewCustomScale.y * sectionData.piece.tags.initialScaleY) : thisBot.tags.initialScaleY,
                        scaleZ: thisBot.tags.desiredScaleZ
                    },
                    duration,
                    easing
                }),
                ((prevShape === BibleVizUtils.Data.tags.BookShapeType.Selected) && infoLabelTransformer) ? infoLabelTransformer.Hide({isInstantaneous}).then(() => {ObjectPooler.ReleaseObject({obj: infoLabelTransformer, tag: infoLabelTransformer.tags.poolTag})}) : null
            ])
        }
        if(!bookData.isSelected && !thisBot.masks.isHighlighted)
        {
            setTagMask(thisBot, "strokeColor", "clear");
        }
    }
    break;
    case BibleVizUtils.Data.tags.BookShapeType.Regular:
    {
        setTagMask(thisBot, "color", BibleVizUtils.Data.masks.isInHistoryMode ? BibleVizUtils.Functions.GetHistoryColor({piece: thisBot}) : (bookData.highlightColor ?? thisBot.tags.initialColor))
        if(isInstantaneous)
        {
            if(prevShape !== BibleVizUtils.Data.tags.BookShapeType.Regular) setTagMask(thisBot, "formOpacity", thisBot.tags.unhoveredOpacity)
            setTagMask(thisBot, "scaleX", thisBot.tags.explodedViewCustomScale ? (thisBot.tags.explodedViewCustomScale.x * sectionData.piece.tags.initialScaleX) : thisBot.tags.initialScaleX)
            setTagMask(thisBot, "scaleY", thisBot.tags.explodedViewCustomScale ? (thisBot.tags.explodedViewCustomScale.y * sectionData.piece.tags.initialScaleY) : thisBot.tags.initialScaleY)
            setTagMask(thisBot, "scaleZ", thisBot.tags.desiredScaleZ)
        }
        else
        {
            await Promise.allSettled([
                animateTag(thisBot, {
                    fromValue: {
                        formOpacity: prevShape !== BibleVizUtils.Data.tags.BookShapeType.ExplodedView ? thisBot.tags.formOpacity : null,
                        scaleX: bookScales.x,
                        scaleY: bookScales.y,
                        scaleZ: bookScales.z
                    },
                    toValue: {
                        formOpacity: prevShape !== BibleVizUtils.Data.tags.BookShapeType.ExplodedView ? thisBot.tags.unhoveredOpacity : null,
                        scaleX: thisBot.tags.initialScaleX,
                        scaleY: thisBot.tags.initialScaleY,
                        scaleZ: thisBot.tags.desiredScaleZ
                    },
                    duration,
                    easing
                }),
                ((prevShape === BibleVizUtils.Data.tags.BookShapeType.Selected) && infoLabelTransformer) ? infoLabelTransformer.Hide({isInstantaneous}).then(() => {ObjectPooler.ReleaseObject({obj: infoLabelTransformer, tag: infoLabelTransformer.tags.poolTag})}) : null
            ])
        }
        if(!bookData.isSelected && !thisBot.masks.isHighlighted)
        {
            setTagMask(thisBot, "strokeColor", "clear");
        }
    }
    break;
    case BibleVizUtils.Data.tags.BookShapeType.RegularSelected:
    {
        setTagMask(thisBot, "strokeColor", "#FFFFFF");
        await Promise.allSettled([
            animateTag(thisBot, {
                fromValue: {
                    formOpacity: thisBot.tags.formOpacity,
                    scaleX: bookScales.x,
                    scaleY: bookScales.y,
                    scaleZ: bookScales.z
                },
                toValue: {
                    formOpacity: selectedOpacity,
                    scaleX: thisBot.tags.initialScaleX,
                    scaleY: thisBot.tags.initialScaleY,
                    scaleZ: thisBot.tags.desiredScaleZ
                },
                duration,
                easing
            }),
            ((prevShape === BibleVizUtils.Data.tags.BookShapeType.Selected) && infoLabelTransformer) ? infoLabelTransformer.Hide({isInstantaneous}).then(() => {ObjectPooler.ReleaseObject({obj: infoLabelTransformer, tag: infoLabelTransformer.tags.poolTag})}) : null
        ])
        setTagMask(thisBot, "color", "clear");
    }
    break;
    case BibleVizUtils.Data.tags.BookShapeType.Selected:
    {
        await Promise.allSettled([
            prevShape !== BibleVizUtils.Data.tags.BookShapeType.RegularSelected ? ColorLerper.LerpTag({startingColor: BibleVizUtils.Functions.HexToRgb({hexColor: thisBot.masks.color ?? thisBot.tags.color}), endingColor: [255, 255, 255], durationInSeconds: duration, bot: thisBot, tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color}) : null,
            animateTag(thisBot, {
                fromValue: {
                    scaleX: bookScales.x,
                    scaleY: bookScales.y,
                    scaleZ: bookScales.z
                },
                toValue: {
                    scaleX: bookData instanceof StackSectionBookData ? bookData.piece.tags.initialScaleX : bookData.piece.tags.singleBooksScales.x,
                    scaleY: bookData instanceof StackSectionBookData ? bookData.piece.tags.initialScaleY : bookData.piece.tags.singleBooksScales.y,
                    scaleZ: bookData instanceof StackSectionBookData ? thisBot.tags.desiredScaleZ : thisBot.tags.explodedViewSelectedScaleZ
                },
                duration,
                easing
            })
        ])
        const {infoLabelTransformer} = BibleVizUtils.Functions.GetLabelForPiece({
            piece: thisBot, 
            label: thisBot.tags.bookName, 
            color: (bookData.highlightColor ?? thisBot.tags.labelTextColor),
            labelColor: "white", 
            dimension,
            labelPositioning: thisBot.masks.isOnTheGround ? BibleVizUtils.Data.tags.LabelPositioning.Top : BibleVizUtils.Data.tags.LabelPositioning.RightSided,
            isAnimatable: false
        });
        setTagMask(thisBot, "strokeColor", "#FFFFFF");
        await animateTag(thisBot, "formOpacity", {
            toValue: selectedOpacity,
            duration,
            easing
        })
        setTagMask(thisBot, "color", "clear");
        await infoLabelTransformer.Show({isInstantaneous});
    }
    break;
}
return true;