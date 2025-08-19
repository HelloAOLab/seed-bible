import {LayoutData} from "bibleLayout3D.main.LayoutData"
import {LayoutBookData} from "bibleLayout3D.main.LayoutBookData"
import {LayoutChapterData} from "bibleLayout3D.main.LayoutChapterData"
let {elementData} = that;
const {element} = that;
if(!elementData)
{
    if(element.tags.isLayoutCover)
    {
        elementData = thisBot.vars.layoutsData.find((layoutData) => {return layoutData.id == element.tags.layoutId});
    }
    else if(element.tags.isMapElement)
    {
        elementData = thisBot.GetElementData({element});
    }
}
if(elementData)
{
    switch(true)
    {
        case elementData instanceof LayoutData: 
            DeleteLayout(elementData);
        break;
        case elementData instanceof LayoutBookData: 
            DeleteBook(elementData)
        break;
        case elementData instanceof LayoutChapterData: 
            DeleteChapter(elementData); 
        break;
        default: break;
    }
}
else console.warn('bibleLayout3D.main.DeleteElement. No element data found.')

function DeleteChapter(chapterData)
{
    const chapterDataIndex = thisBot.vars.layoutChaptersData.indexOf(chapterData);
    if(chapterData.element)
    {
        BibleVizUtils.Functions.TryHideUsersNotificationOnElement({element: chapterData.element});
        if(chapterData.isSelected && Array.isArray(chapterData.element.vars.chunksOfVerses) && chapterData.element.vars.chunksOfVerses.length > 0)
        {
            chapterData.element.vars.chunksOfVerses.forEach((chunk) => {
                if(chunk.masks.isSelected && Array.isArray(chunk.vars.verses) && chunk.vars.verses.length > 0)
                {
                    chunk.vars.verses.flat().forEach((verse) => {ObjectPooler.ReleaseObject({obj: verse, tag: verse.tags.poolTag})})
                    chunk.vars.verses.splice(0, chunk.vars.verses.length);
                }
                ObjectPooler.ReleaseObject({obj: chunk, tag: chunk.tags.poolTag});
            })
            chapterData.element.vars.chunksOfVerses.splice(0, chapterData.element.vars.chunksOfVerses.length);
        }
        ObjectPooler.ReleaseObject({obj: chapterData.element, tag: chapterData.element.tags.poolTag});
        chapterData.element = null;
    }
    chapterData.elementInfo = null;
    chapterData.parentDataIds = null;
    chapterData.ResetData();
    if(chapterDataIndex >= 0) thisBot.vars.layoutChaptersData.splice(chapterDataIndex, 1);
}

function DeleteBook(layoutBookData)
{
    const bookDataIndex = thisBot.vars.layoutBooksData.indexOf(layoutBookData);
    layoutBookData.childrenData.forEach((chapterData) => {DeleteChapter(chapterData)});
    layoutBookData.childrenData.splice(0, layoutBookData.childrenData.length);
    if(layoutBookData.element)
    {
       
        ObjectPooler.ReleaseObject({obj: layoutBookData.element, tag: layoutBookData.element.tags.poolTag});
        layoutBookData.element = null;
    }
    
    layoutBookData.elementInfo = null;
    layoutBookData.parentDataIds = null;
    layoutBookData.creationInfo = null;

    if(bookDataIndex >= 0) thisBot.vars.layoutBooksData.splice(bookDataIndex, 1);
}

function DeleteLayout(layoutData)
{
    const layoutDataIndex = thisBot.vars.layoutsData.indexOf(layoutData);
    const staticLayoutElementsKeys = Object.keys(layoutData.staticLayoutElements)
    layoutData.childrenStructures
        .forEach((layoutBookStructure) => {
            DeleteBook(layoutBookStructure.layoutBookData)

            ObjectPooler.ReleaseObject({obj: layoutBookStructure.nameLabel, tag: layoutBookStructure.nameLabel.tags.poolTag});
            ObjectPooler.ReleaseObject({obj: layoutBookStructure.dateLabel, tag: layoutBookStructure.dateLabel.tags.poolTag});

            layoutBookStructure.layoutBookData = null;
            layoutBookStructure.nameLabel = null;
            layoutBookStructure.dateLabel = null;
            const bookStructureIndex = thisBot.vars.layoutBooksStructure.indexOf(layoutBookStructure);
            if(bookStructureIndex >= 0) thisBot.vars.layoutBooksStructure.splice(bookStructureIndex, 1);
        });
    layoutData.childrenStructures.splice(0, layoutData.childrenStructures.length);
    staticLayoutElementsKeys.forEach((key) => {
        const element = layoutData.staticLayoutElements[key]
        const fixedElement = Array.isArray(element) ? element : [element]
        fixedElement.forEach((currElement) => {
            ObjectPooler.ReleaseObject({obj: currElement, tag: currElement.tags.poolTag});
        })
        layoutData.staticLayoutElements[key] = null;
    })    
    layoutData.staticLayoutElements = null;
    if(layoutDataIndex >= 0) thisBot.vars.layoutsData.splice(layoutDataIndex, 1);
}