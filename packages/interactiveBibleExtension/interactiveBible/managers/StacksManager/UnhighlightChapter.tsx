/**
 * Unhighlights a previously highlighted chapter in the parent data's chapter list.
 * This function checks if there is a previously highlighted chapter that is active
 * and not in the process of being unhighlighted. If so, it unhighlights it and resets
 * the reference in the parent data.
 *
 * @param {Object} that - The object containing parent and chapter data.
 * @param {BookData|SectionBookData} that.parentData - The data containing the chapter in its structure.
 * @param {ChapterData} that.chapterData - The data associated to the chapter being unhighlighted.
 *
 * @example
 * StacksManager.UnhighlightChapter({ parentData: someData, chapterData: someChapterData });
 */

const {parentData} = that;

const previousHighlightedChapterData = parentData.element.vars.previousHighlightedChapterData;

if( previousHighlightedChapterData &&
    previousHighlightedChapterData.isActive &&
    !previousHighlightedChapterData.chapterTransformer.masks.isUnhighlighting         &&
    previousHighlightedChapterData.chapterTransformer.tags.isInUse                    &&
    (previousHighlightedChapterData.chapterTransformer.masks.isHighlighted || previousHighlightedChapterData.chapterTransformer.masks.isHighlighting) &&
    !previousHighlightedChapterData.chapterTransformer.masks.isSelecting              &&
    !previousHighlightedChapterData.chapterTransformer.masks.isSelected)
{
    previousHighlightedChapterData.chapterTransformer.Unhighlight({chapterData: previousHighlightedChapterData});
    parentData.element.vars.previousHighlightedChapterData = null;
}