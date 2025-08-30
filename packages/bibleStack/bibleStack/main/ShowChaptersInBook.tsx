import {StackSectionBookData} from "bibleVizUtils.classes.StackSectionBookData"

const {data, dimension} = that;

const biggerChapter = BibleVizUtils.Functions.GetBiggerChapter();
setTagMask(data.piece, "isShowingChapters", true);
for(const chapterData of data.childrenData)
{
    const idx = data.childrenData.indexOf(chapterData);
    if(!chapterData.isActive)
    {
        const isSectionBookDataInstance = data instanceof StackSectionBookData || data.constructor.name === "StackSectionBookData";
        const chapter = ObjectPooler.GetObjectFromPool({tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackChapter});
        const chapterDeltaDepth = (data.piece.masks.scaleY - (chapter.tags.gapY*2) - BibleVizUtils.Data.tags.StackPieceMeasurements.MinChapterBackDepth) * (chapterData.pieceInfo.amountOfVerses / biggerChapter);
        const chapterMod = {
            [dimension]: true,
            [dimension + "X"]: 0,
            [dimension + "Y"]: 0,
            [dimension + "Z"]: 0,
            creator: null,
            index: idx,
            chapterNumber: idx+1,
            chapterWidth: BibleVizUtils.Data.tags.StackPieceMeasurements.ChapterWidth,
            chapterHeight: BibleVizUtils.Data.tags.StackPieceMeasurements.ChapterHeight,
            arrangementIndex: data.piece.tags.arrangementIndex,
            parentBookName: data.piece.tags.bookName,
            scaleX: BibleVizUtils.Data.tags.StackPieceMeasurements.ChapterWidth,
            scaleY: BibleVizUtils.Data.tags.StackPieceMeasurements.MinChapterBackDepth + chapterDeltaDepth,
            scaleZ: BibleVizUtils.Data.tags.StackPieceMeasurements.ChapterHeight,
            initialScaleX: BibleVizUtils.Data.tags.StackPieceMeasurements.ChapterWidth,
            initialScaleY: BibleVizUtils.Data.tags.StackPieceMeasurements.MinChapterBackDepth + chapterDeltaDepth,
            initialScaleZ: BibleVizUtils.Data.tags.StackPieceMeasurements.ChapterHeight,
            initialScaleY: BibleVizUtils.Data.tags.StackPieceMeasurements.MinChapterBackDepth + chapterDeltaDepth,
            selectedScaleY: BibleVizUtils.Data.tags.StackPieceMeasurements.MinChapterBackDepth + chapterDeltaDepth + BibleVizUtils.Data.tags.StackPieceMeasurements.ChapterFrontSelectedDepth,
            label: (idx + 1) + ((isSectionBookDataInstance ? data.pieceBookInfo.startingIndex : data.pieceInfo.startingIndex) ?? 0),
        }

        chapter.OnSpawned({mod: chapterMod});
        chapterData.piece = chapter;
        chapterData.isInsideBible = data.isInsideBible;
        chapterData.isInsideBook = true;
        chapterData.isActive = true;
        chapterData.isHidden = false;
        if(BibleVizUtils.Data.masks.isInHistoryMode) setTagMask(chapter, "color", BibleVizUtils.Functions.GetHistoryColor({piece: chapter}))
    }
}
data.piece.TrySetChaptersPosition({setX: true, setY: true, setZ: true});