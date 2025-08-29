import {StackSectionBookData} from "bibleVizUtils.classes.StackSectionBookData"

const {
    bookData, 
    bookDataArr, 
    bookDataIndex, 
    sectionData, 
    selectedBooksTotalHeight,
    selectedBooksTotalMargin,
    dimension,
    duration,
    isInstantaneous,
    easing,
    speedMultiplier = 1
} = that;

let {
    desiredPositionX,
    desiredPositionY,
    desiredPositionZ
} = that;

const {chapterColumns, chapterRows, selectedBookHeight} = await thisBot.ComputeSelectedBookLayout({data: bookData});
const bookPosition = getBotPosition(bookData.piece, dimension);
let absBookDesiredPosition;
let halfInitialBookScales;
let marginToAdd = 0;
const newBookAnimations = [];
const initialDesiredPositionX = desiredPositionX;
const initialDesiredPositionY = desiredPositionY;
const isSectionBookDataInstance = bookData instanceof StackSectionBookData || bookData.constructor.name === "StackSectionBookData";

if(bookData.isSelected)
{
    setTag(bookData.piece, "chapterColumns", chapterColumns);
    setTag(bookData.piece, "chapterRows", chapterRows);
    if(isSectionBookDataInstance) setTag(bookData.piece, "desiredScaleZ", selectedBookHeight);
    else setTag(bookData.piece, "explodedViewSelectedScaleZ", selectedBookHeight);
    setTagMask(bookData.piece, "pointable", sectionData && !sectionData.isInExplodedView ? true : false);
    if(sectionData && !sectionData.isInExplodedView && bookData.piece.masks.isShowingChapters) bookData.piece.HideChapters();
    newBookAnimations.push(bookData.piece.TrySetShape({isInstantaneous, speedMultiplier, shape: !sectionData || sectionData.isInExplodedView ? BibleVizUtils.Data.tags.BookShapeType.Selected : BibleVizUtils.Data.tags.BookShapeType.RegularSelected}).then(() => {
        if(bookData.currentShape === BibleVizUtils.Data.tags.BookShapeType.Selected && !bookData.piece.masks.isShowingChapters)
        {
            thisBot.ShowChaptersInBook({data: bookData, dimension});
        }
    }))
}
else
{
    if(isSectionBookDataInstance) setTag(bookData.piece, "desiredScaleZ", bookData.piece.tags.initialScaleZ);
    if(bookData.piece.masks.isShowingChapters)
    {
        bookData.piece.HideChapters();
    }
    newBookAnimations.push(bookData.piece.TrySetShape({isInstantaneous, speedMultiplier, shape: sectionData?.isInExplodedView ? BibleVizUtils.Data.tags.BookShapeType.ExplodedView : BibleVizUtils.Data.tags.BookShapeType.Regular}));
}

if(sectionData)
{
    if(sectionData.isInExplodedView)
    {
        desiredPositionZ += ((bookData.piece.tags.explodedViewPosition.z * sectionData.piece.tags.desiredExplodedViewScaleZ) - (bookData.piece.tags.desiredScaleZ/2) + selectedBooksTotalHeight + selectedBooksTotalMargin);
        if(bookData.isSelected)
        {
            desiredPositionZ += BibleVizUtils.Data.tags.StackSpacing.SelectedBookMargin;
            marginToAdd += (BibleVizUtils.Data.tags.StackSpacing.SelectedBookMargin*2);
            if(bookDataIndex > 0)
            {
                const previousValidGroupBookData = thisBot.FindPreviousValidGroupBookData({arr: bookDataArr, currIndex: bookDataIndex});
                if(previousValidGroupBookData)
                {
                    const tempBookDesiredPositionZ = previousValidGroupBookData.piece.tags.desiredPositionZ + previousValidGroupBookData.piece.tags.desiredScaleZ + BibleVizUtils.Data.tags.StackSpacing.SelectedBookMargin
                    if(tempBookDesiredPositionZ && tempBookDesiredPositionZ > desiredPositionZ)
                    {
                        marginToAdd += (tempBookDesiredPositionZ - desiredPositionZ)
                        desiredPositionZ = tempBookDesiredPositionZ
                    }
                }
            }
        }
        else
        {
            desiredPositionX += (bookData.piece.tags.explodedViewPosition.x * BibleVizUtils.Data.tags.StackPieceMeasurements.SectionScales.x);
            desiredPositionY += (bookData.piece.tags.explodedViewPosition.y * BibleVizUtils.Data.tags.StackPieceMeasurements.SectionScales.y);
        }
    }
    else
    {
        if(bookData.piece.tags.isGroupBook)
        {
            desiredPositionX += bookData.piece.tags.layoutPositionX;
            desiredPositionY += bookData.piece.tags.layoutPositionY;
        }
    }
    absBookDesiredPosition = {x: Math.abs(desiredPositionX - initialDesiredPositionX), y: Math.abs(desiredPositionY - initialDesiredPositionY)};
    halfInitialBookScales = {x: (bookData.piece.tags.initialScaleX / 2), y: (bookData.piece.tags.initialScaleY / 2)};
}

setTag(bookData.piece, "desiredPositionZ", desiredPositionZ);
if(isInstantaneous)
{
    setTagMask(bookData.piece, dimension + "X", desiredPositionX)
    setTagMask(bookData.piece, dimension + "Y", desiredPositionY)
    setTagMask(bookData.piece, dimension + "Z", desiredPositionZ)
}
else
{
    newBookAnimations.push(
        animateTag(bookData.piece, {
            fromValue: {
                [dimension + "X"]: bookPosition.x,
                [dimension + "Y"]: bookPosition.y,
                [dimension + "Z"]: bookPosition.z
            },
            toValue: {
                [dimension + "X"]: desiredPositionX,
                [dimension + "Y"]: desiredPositionY,
                [dimension + "Z"]: desiredPositionZ
            },
            duration,
            easing
        })
    )
}

return {absBookDesiredPosition, halfInitialBookScales, selectedBookHeight, marginToAdd, newBookAnimations};