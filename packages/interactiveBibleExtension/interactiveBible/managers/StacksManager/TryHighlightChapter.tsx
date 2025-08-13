/**
 * Attempts to highlight a specific chapter within its parent data structure. It manages the highlighting state
 * to ensure that only one chapter can be highlighted at a time and handles any previous highlights accordingly.
 * 
 * @param {Object} that - The object containing parameters for the operation.
 * @param {BookData|SectionBookData} that.parentData - The parent data object containing state information.
 * @param {ChapterData} that.chapterData - The chapter data object to be highlighted.
 * @returns {boolean} - Returns false if the chapter cannot be highlighted, otherwise it highlights the chapter and returns nothing.
 * 
 * @example
 * const success = StacksManager.TryHighlightChapter({parentData: someData, chapterData: someChapterData});
 */

const {parentData, chapterData} = that;

const previousHighlightedChapterData = parentData?.element.vars.previousHighlightedChapterData;

if((previousHighlightedChapterData && previousHighlightedChapterData == chapterData)    || 
    chapterData.element.masks.isSelecting                                    || 
    chapterData.element.masks.isDeselecting                                  ||
    chapterData.element.masks.isHighlighting                                 || 
    (chapterData.element.masks.isHighlighted && !chapterData.element.masks.isUnhighlighting)) return false;

if( previousHighlightedChapterData                                                    &&
    previousHighlightedChapterData.isActive                                           &&
    !previousHighlightedChapterData.isHidden                                          &&
    !previousHighlightedChapterData.element.masks.isUnhighlighting         &&
    previousHighlightedChapterData.element.tags.isInUse                    &&
    (previousHighlightedChapterData.element.masks.isHighlighted || previousHighlightedChapterData.element.masks.isHighlighting) &&
    !previousHighlightedChapterData.element.masks.isSelecting              &&
    !previousHighlightedChapterData.isSelected)
{
    previousHighlightedChapterData.element.Unhighlight({chapterData: previousHighlightedChapterData});
    parentData.element.vars.previousHighlightedChapterData = null;
}
if(chapterData.element.masks.isOnTheGround && !chapterData.isSelected) 
{
    InstanceManager.TryHideUsersNotificationOnElement({element: chapterData.element})
}
chapterData.element.Highlight({chapterData});
if(parentData) parentData.element.vars.previousHighlightedChapterData = chapterData;