/**
    * This tag try to set the book shape into the one passed as an argument
    * @param {Object} that - Object that contains important data for the function
    * @param {String} that.shape - The type of shape the book attempts to set its shape. Allowed types of shape can be found at globalThis.BookShapeType
    * @param {Number} that.duration? - Is optional and is a custom duration for the animation
    * @example
    * thisBot.TrySetShape({shape: BookShapeType.Regular})
*/

import {SectionBookData} from "managers.StacksManager.SectionBookData"

const dimension = os.getCurrentDimension();
let {shape, duration = 0.5, speedMultiplier = 1, isInstantaneous = false} = that;
duration = duration/speedMultiplier;
const bookData = StacksManager.GetBibleElementData({element: thisBot});
const {sectionData} = StacksManager.GetDataChainFromParentDataIds({parentDataIds: bookData.parentDataIds});
const prevShape = bookData.currentShape;
if(shape === bookData.currentShape) return false;
const bookScales = GetBotScales(thisBot);
const easing = {type: "sinusoidal", mode: "inout"};
const selectedOpacity = 0;
const infoLabelTransformer = GetCurrentInfoLabelTransformer(thisBot)
bookData.currentShape = shape;
switch(shape)
{
    case BookShapeType.ExplodedView:
    {
        setTagMask(thisBot, "color", InstanceManager.masks.isInHistoryMode ? GetHistoryColor({element: thisBot}) : (bookData.highlightColor ?? thisBot.tags.initialColor))
        if(isInstantaneous)
        {
            if(prevShape !== BookShapeType.Regular) setTagMask(thisBot, "formOpacity", thisBot.tags.unhoveredOpacity)
            setTagMask(thisBot, "scaleX", thisBot.tags.explodedViewCustomScale ? (thisBot.tags.explodedViewCustomScale.x * sectionData.element.tags.initialScaleX) : thisBot.tags.initialScaleX)
            setTagMask(thisBot, "scaleY", thisBot.tags.explodedViewCustomScale ? (thisBot.tags.explodedViewCustomScale.y * sectionData.element.tags.initialScaleY) : thisBot.tags.initialScaleY)
            setTagMask(thisBot, "scaleZ", thisBot.tags.desiredScaleZ)
        }
        else
        {
            await Promise.allSettled([
                animateTag(thisBot, {
                    fromValue: {
                        formOpacity: prevShape !== BookShapeType.Regular ? thisBot.tags.formOpacity : null,
                        scaleX: bookScales.x,
                        scaleY: bookScales.y,
                        scaleZ: bookScales.z
                    },
                    toValue: {
                        formOpacity: prevShape !== BookShapeType.Regular ? thisBot.tags.unhoveredOpacity : null,
                        scaleX: thisBot.tags.explodedViewCustomScale ? (thisBot.tags.explodedViewCustomScale.x * sectionData.element.tags.initialScaleX) : thisBot.tags.initialScaleX,
                        scaleY: thisBot.tags.explodedViewCustomScale ? (thisBot.tags.explodedViewCustomScale.y * sectionData.element.tags.initialScaleY) : thisBot.tags.initialScaleY,
                        scaleZ: thisBot.tags.desiredScaleZ
                    },
                    duration,
                    easing
                }),
                ((prevShape === BookShapeType.Selected) && infoLabelTransformer) ? infoLabelTransformer.Hide({isInstantaneous}).then(() => {ObjectPooler.ReleaseObject({obj: infoLabelTransformer, tag: infoLabelTransformer.tags.poolTag})}) : null
            ])
        }
        if(!bookData.isSelected && !thisBot.masks.isHighlighted)
        {
            setTagMask(thisBot, "strokeColor", "clear");
        }
    }
    break;
    case BookShapeType.Regular:
    {
        setTagMask(thisBot, "color", InstanceManager.masks.isInHistoryMode ? GetHistoryColor({element: thisBot}) : (bookData.highlightColor ?? thisBot.tags.initialColor))
        if(isInstantaneous)
        {
            if(prevShape !== BookShapeType.Regular) setTagMask(thisBot, "formOpacity", thisBot.tags.unhoveredOpacity)
            setTagMask(thisBot, "scaleX", thisBot.tags.explodedViewCustomScale ? (thisBot.tags.explodedViewCustomScale.x * sectionData.element.tags.initialScaleX) : thisBot.tags.initialScaleX)
            setTagMask(thisBot, "scaleY", thisBot.tags.explodedViewCustomScale ? (thisBot.tags.explodedViewCustomScale.y * sectionData.element.tags.initialScaleY) : thisBot.tags.initialScaleY)
            setTagMask(thisBot, "scaleZ", thisBot.tags.desiredScaleZ)
        }
        else
        {
            await Promise.allSettled([
                animateTag(thisBot, {
                    fromValue: {
                        formOpacity: prevShape !== BookShapeType.ExplodedView ? thisBot.tags.formOpacity : null,
                        scaleX: bookScales.x,
                        scaleY: bookScales.y,
                        scaleZ: bookScales.z
                    },
                    toValue: {
                        formOpacity: prevShape !== BookShapeType.ExplodedView ? thisBot.tags.unhoveredOpacity : null,
                        scaleX: thisBot.tags.initialScaleX,
                        scaleY: thisBot.tags.initialScaleY,
                        scaleZ: thisBot.tags.desiredScaleZ
                    },
                    duration,
                    easing
                }),
                ((prevShape === BookShapeType.Selected) && infoLabelTransformer) ? infoLabelTransformer.Hide({isInstantaneous}).then(() => {ObjectPooler.ReleaseObject({obj: infoLabelTransformer, tag: infoLabelTransformer.tags.poolTag})}) : null
            ])
        }
        if(!bookData.isSelected && !thisBot.masks.isHighlighted)
        {
            setTagMask(thisBot, "strokeColor", "clear");
        }
    }
    break;
    case BookShapeType.RegularSelected:
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
            ((prevShape === BookShapeType.Selected) && infoLabelTransformer) ? infoLabelTransformer.Hide({isInstantaneous}).then(() => {ObjectPooler.ReleaseObject({obj: infoLabelTransformer, tag: infoLabelTransformer.tags.poolTag})}) : null
        ])
        setTagMask(thisBot, "color", "clear");
    }
    break;
    case BookShapeType.Selected:
    {
        await Promise.allSettled([
            prevShape !== BookShapeType.RegularSelected ? LerpColorManager.LerpTagColor({startingColor: HexToRgb(thisBot.masks.color ?? thisBot.tags.color), endingColor: [255, 255, 255], durationInSeconds: duration, bot: thisBot, tag: InterpolatableColorTags.Color}) : null,
            animateTag(thisBot, {
                fromValue: {
                    scaleX: bookScales.x,
                    scaleY: bookScales.y,
                    scaleZ: bookScales.z
                },
                toValue: {
                    scaleX: bookData instanceof SectionBookData ? bookData.element.tags.initialScaleX : bookData.element.tags.singleBooksScales.x,
                    scaleY: bookData instanceof SectionBookData ? bookData.element.tags.initialScaleY : bookData.element.tags.singleBooksScales.y,
                    scaleZ: bookData instanceof SectionBookData ? thisBot.tags.desiredScaleZ : thisBot.tags.explodedViewSelectedScaleZ
                },
                duration,
                easing
            })
        ])
        const {infoLabelTransformer} = await StacksManager.GetLabelForElement({
            element: thisBot, 
            label: thisBot.tags.bookName, 
            color: (bookData.highlightColor ?? thisBot.tags.labelTextColor),
            labelColor: "white", 
            dimension,
            labelPositioning: thisBot.masks.isOnTheGround ? LabelPositioning.Top : LabelPositioning.RightSided,
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