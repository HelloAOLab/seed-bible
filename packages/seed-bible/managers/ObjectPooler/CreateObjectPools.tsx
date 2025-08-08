/**
    * Receives a tag and return the fisrt object of the pool that matches with that tag if it exists
    * @param {Object} that - Object that contains important data for the function
    * @param {String} that.tag - The tag that the pool should match with
    * @example
    * const obj = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.ConfettiParticle});
*/

import {PoolData} from "managers.ObjectPooler.PoolData"
import {Pool} from "managers.ObjectPooler.Pool"
import {CustomTag} from "managers.ObjectPooler.CustomTag"

const infoLabelPool = new PoolData({
    tag: ObjectPoolTags.InfoLabel,
    bot: getBot(byTag("isBaseInfoLabel", true)),
    customTags: [
        new CustomTag({name: "isBaseInfoLabel", value: false}),
        new CustomTag({name: "isInfoLabel", value: true}),
        new CustomTag({name: "poolTag", value: ObjectPoolTags.InfoLabel}),
        new CustomTag({name: "system", value: null})
    ],
    size: 8
})
const infoLabelTailPool = new PoolData({
    tag: ObjectPoolTags.InfoLabelTail,
    bot: getBot(byTag("isBaseInfoLabelTail", true)),
    customTags: [
        new CustomTag({name: "isBaseInfoLabelTail", value: false}),
        new CustomTag({name: "isInfoLabelTail", value: true}),
        new CustomTag({name: "poolTag", value: ObjectPoolTags.InfoLabelTail}),
        new CustomTag({name: "system", value: null})
    ],
    size: 8
})
const infoLabelDatePool = new PoolData({
    tag: ObjectPoolTags.InfoLabelDate,
    bot: links.baseInfoLabelDate,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.InfoLabelDate}),
        new CustomTag({name: "isInfoLabelDate", value: true}),
        new CustomTag({name: "system", value: null})
    ],
    size: 8
})
const infoLabelTransformerPool = new PoolData({
    tag: ObjectPoolTags.InfoLabelTransformer,
    bot: getBot(byTag("isBaseInfoLabelTransformer", true)),
    customTags: [
        new CustomTag({name: "isBaseInfoLabelTransformer", value: false}),
        new CustomTag({name: "isInfoLabelTransformer", value: true}),
        new CustomTag({name: "poolTag", value: ObjectPoolTags.InfoLabelTransformer}),
        new CustomTag({name: "system", value: null})
    ],
    size: 8
})
const userColorPool = new PoolData({
    tag: ObjectPoolTags.UserColor,
    bot: links.baseUserColor,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.UserColor}),
        new CustomTag({name: "isUserColor", value: true}),
        new CustomTag({name: "system", value: null})
    ],
    size: 8
})
const sectionShadowPool = new PoolData({
    tag: ObjectPoolTags.SectionShadow,
    bot: getBot(byTag("isBaseSectionShadow", true)),
    customTags: [
        new CustomTag({name: "isBaseSectionShadow", value: false}),
        new CustomTag({name: "isSectionShadow", value: true}),
        new CustomTag({name: "poolTag", value: ObjectPoolTags.SectionShadow}),
        new CustomTag({name: "system", value: null})
    ],
    size: 8
})
const chapterPool = new PoolData({
    tag: ObjectPoolTags.Chapter,
    bot: getBot(byTag("isBaseChapter", true)),
    customTags: [
        new CustomTag({name: "isBaseChapter", value: false}),
        new CustomTag({name: "typeOfElement", value: BibleElementType.Chapter}),
        new CustomTag({name: "poolTag", value: ObjectPoolTags.Chapter}),
        new CustomTag({name: "isBibleElement", value: true}),
        new CustomTag({name: "system", value: null})
    ],
    size: 20
})
const chunkOfVersesPool = new PoolData({
    tag: ObjectPoolTags.ChunkOfVerses,
    bot: getBot(byTag("isBaseChunkOfVerses", true)),
    customTags: [
        new CustomTag({name: "isBaseChunkOfVerses", value: false}),
        new CustomTag({name: "typeOfElement", value: BibleElementType.ChunkOfVerses}),
        new CustomTag({name: "poolTag", value: ObjectPoolTags.ChunkOfVerses}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 3
})
const versesPool = new PoolData({
    tag: ObjectPoolTags.Verse,
    bot: getBot(byTag("isBaseVerse", true)),
    customTags: [
        new CustomTag({name: "isBaseVerse", value: false}),
        new CustomTag({name: "typeOfElement", value: BibleElementType.Verse}),
        new CustomTag({name: "poolTag", value: ObjectPoolTags.Verse}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 3
})
const booksPool = new PoolData({
    tag: ObjectPoolTags.Book,
    bot: getBot(byTag("isBaseBook", true)),
    customTags: [
        new CustomTag({name: "isBaseBook", value: false}),
        new CustomTag({name: "typeOfElement", value: BibleElementType.Book}),
        new CustomTag({name: "poolTag", value: ObjectPoolTags.Book}),
        new CustomTag({name: "isBibleElement", value: true}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 20
})
const sectionsPool = new PoolData({
    tag: ObjectPoolTags.Section,
    bot: getBot(byTag("isBaseSection", true)),
    customTags: [
        new CustomTag({name: "isBaseSection", value: false}),
        new CustomTag({name: "typeOfElement", value: BibleElementType.Section}),
        new CustomTag({name: "poolTag", value: ObjectPoolTags.Section}),
        new CustomTag({name: "isBibleElement", value: true}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 8
})
const testamentsPool = new PoolData({
    tag: ObjectPoolTags.Testament,
    bot: getBot(byTag("isBaseTestament", true)),
    customTags: [
        new CustomTag({name: "isBaseTestament", value: false}),
        new CustomTag({name: "typeOfElement", value: BibleElementType.Testament}),
        new CustomTag({name: "poolTag", value: ObjectPoolTags.Testament}),
        new CustomTag({name: "isBibleElement", value: true}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 2
})
const bibleTransformersPool = new PoolData({
    tag: ObjectPoolTags.BibleTransformer,
    bot: getBot(byTag("isBaseBibleTransformer", true)),
    customTags: [
        new CustomTag({name: "isBaseBibleTransformer", value: false}),
        new CustomTag({name: "isBibleTransformer", value: true}),
        new CustomTag({name: "poolTag", value: ObjectPoolTags.BibleTransformer}),
        new CustomTag({name: 'toErase', value: true}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 1
})
const coversPool = new PoolData({
    tag: ObjectPoolTags.Cover,
    bot: getBot(byTag("isBaseCover", true)),
    customTags: [
        new CustomTag({name: "isBaseCover", value: false}),
        new CustomTag({name: "poolTag", value: ObjectPoolTags.Cover}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 3
})
const crossLinesPool = new PoolData({
    tag: ObjectPoolTags.CrossLine,
    bot: getBot(byTag("isBaseCrossLine", true)),
    customTags: [
        new CustomTag({name: "isBaseCrossLine", value: false}),
        new CustomTag({name: "poolTag", value: ObjectPoolTags.CrossLine}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 2
})
const bibleShadowsPool = new PoolData({
    tag: ObjectPoolTags.BibleShadow,
    bot: getBot(byTag("isBaseShadow", true)),
    customTags: [
        new CustomTag({name: "isBaseShadow", value: false}),
        new CustomTag({name: "poolTag", value: ObjectPoolTags.BibleShadow}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 1
})
const mapCoversPool = new PoolData({
    tag: ObjectPoolTags.MapCover,
    bot: getBot(byTag("isBaseMapCover", true)),
    customTags: [
        new CustomTag({name: "isBaseMapCover", value: false}),
        new CustomTag({name: "isMapCover", value: true}),
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapCover}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 1
})
const mapBooksPool = new PoolData({
    tag: ObjectPoolTags.MapBook,
    bot: links.baseMapBook,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapBook}),
        new CustomTag({name: "typeOfElement", value: BibleElementType.MapBook}),
        new CustomTag({name: "isBaseMapBook", value: false}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 70
})
const mapBookNameLabelsPool = new PoolData({
    tag: ObjectPoolTags.MapBookNameLabel,
    bot: links.baseMapBookNameLabel,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapBookNameLabel}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 70
})
const mapBookDateLabelsPool = new PoolData({
    tag: ObjectPoolTags.MapBookDateLabel,
    bot: links.baseMapBookDateLabel,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapBookDateLabel}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 70
})
const mapLinesPool = new PoolData({
    tag: ObjectPoolTags.MapLine,
    bot: links.baseMapLine,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapLine}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 17
})
const mapLabelsPool = new PoolData({
    tag: ObjectPoolTags.MapLabel,
    bot: links.baseMapLabel,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapLabel}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 6
})
const mapChaptersPool = new PoolData({
    tag: ObjectPoolTags.MapChapter,
    bot: links.baseMapChapter,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapChapter}),
        new CustomTag({name: "typeOfElement", value: BibleElementType.MapChapter}),
        new CustomTag({name: "isBaseMapChapter", value: false}),
        new CustomTag({name: "system", value: null})
    ],
    size: 6
})
const mapToggleButtonsPool = new PoolData({
    tag: ObjectPoolTags.MapToggleButton,
    bot: links.baseMapToggleButton,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapToggleButton}),
        new CustomTag({name: "system", value: null})
    ],
    size: 3
})
const mapToggleBackgroundsPool = new PoolData({
    tag: ObjectPoolTags.MapToggleBackground,
    bot: links.baseMapToggleBackground,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapToggleBackground}),
        new CustomTag({name: "system", value: null})
    ],
    size: 3
})
const mapToggleHandlesPool = new PoolData({
    tag: ObjectPoolTags.MapToggleHandle,
    bot: links.baseMapToggleHandle,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapToggleHandle}),
        new CustomTag({name: "system", value: null})
    ],
    size: 3
})
const mapButtonsPool = new PoolData({
    tag: ObjectPoolTags.MapButton,
    bot: links.baseMapButton,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapButton}),
        new CustomTag({name: "system", value: null})
    ],
    size: 2
})
const mapButtonIconsPool = new PoolData({
    tag: ObjectPoolTags.MapButtonIcon,
    bot: links.baseButtonIcon,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapButtonIcon}),
        new CustomTag({name: "system", value: null})
    ],
    size: 1
})
const mapButtonLabelsPool = new PoolData({
    tag: ObjectPoolTags.MapButtonLabel,
    bot: links.baseButtonLabel,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapButtonLabel}),
        new CustomTag({name: "system", value: null})
    ],
    size: 1
})
const mapColorPickerBackgroundsPool = new PoolData({
    tag: ObjectPoolTags.MapColorPickerBackground,
    bot: links.baseColorPickerBackground,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapColorPickerBackground}),
        new CustomTag({name: "system", value: null})
    ],
    size: 1
})
const mapColorPickerContentsPool = new PoolData({
    tag: ObjectPoolTags.MapColorPickerContent,
    bot: links.baseColorPickerContent,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapColorPickerContent}),
        new CustomTag({name: "system", value: null})
    ],
    size: 1
})
const mapSettingsButtonsPool = new PoolData({
    tag: ObjectPoolTags.MapSettingsButton,
    bot: links.baseSettingsButton,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapSettingsButton}),
        new CustomTag({name: "system", value: null})
    ],
    size: 1
})
const usersNotificationPool = new PoolData({
    tag: ObjectPoolTags.UsersNotification,
    bot: links.baseUsersNotification,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.UsersNotification}),
        new CustomTag({name: "system", value: null})
    ],
    size: 5
})
const elementUsersColorPool = new PoolData({
    tag: ObjectPoolTags.ElementUserColor,
    bot: links.baseElementUsersColor,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.ElementUserColor}),
        new CustomTag({name: "system", value: null}),
        new CustomTag({name: "isElementUserColor", value: true})
    ],
    size: 5
})
const vfxParticle = new PoolData({
    tag: ObjectPoolTags.VFXParticle,
    bot: links.baseVfxParticle,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.VFXParticle}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 20
})

const mapBookInfoCardTransformer = new PoolData({
    tag: ObjectPoolTags.MapBookInfoCardTransformer,
    bot: links.baseMapBookInfoCardTransformer,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapBookInfoCardTransformer}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 1
})
const mapBookInfoCardBackground = new PoolData({
    tag: ObjectPoolTags.MapBookInfoCardBackground,
    bot: links.baseMapBookInfoCardBackground,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapBookInfoCardBackground}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 1
})
const mapBookInfoCardContent = new PoolData({
    tag: ObjectPoolTags.MapBookInfoCardContent,
    bot: links.baseMapBookInfoCardContent,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapBookInfoCardContent}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 1
})

const mapChapterPlaylistEntryItemPool = new PoolData({
    tag: ObjectPoolTags.MapChapterPlaylistEntryItem,
    bot: links.baseMapChapterPlaylistEntryItem,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapChapterPlaylistEntryItem}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 1
})

const mapPlaylistNavigationButton = new PoolData({
    tag: ObjectPoolTags.MapPlaylistNavigationButton,
    bot: links.baseMapPlaylistNavigationButton,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapPlaylistNavigationButton}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 2
})

const mapChapterPlaylistEntryNodePool = new PoolData({
    tag: ObjectPoolTags.MapChapterPlaylistEntryNode,
    bot: links.baseMapChapterPlaylistEntryNode,
    customTags: [
        new CustomTag({name: "poolTag", value: ObjectPoolTags.MapChapterPlaylistEntryNode}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 1
})

const poolDataArray = [
    infoLabelPool,
    infoLabelTailPool,
    infoLabelTransformerPool,
    sectionShadowPool,
    chapterPool,
    chunkOfVersesPool,
    versesPool,
    booksPool,
    sectionsPool,
    testamentsPool,
    bibleTransformersPool,
    coversPool,
    crossLinesPool,
    bibleShadowsPool,
    mapCoversPool,
    mapBooksPool,
    mapBookNameLabelsPool,
    mapBookDateLabelsPool,
    mapLinesPool,
    mapLabelsPool,
    mapChaptersPool,
    mapToggleButtonsPool,
    mapToggleBackgroundsPool,
    mapToggleHandlesPool,
    mapButtonsPool,
    mapButtonIconsPool,
    mapButtonLabelsPool,
    mapColorPickerBackgroundsPool,
    mapColorPickerContentsPool,
    mapSettingsButtonsPool,
    userColorPool,
    usersNotificationPool,
    elementUsersColorPool,
    vfxParticle,
    mapBookInfoCardTransformer,
    mapBookInfoCardBackground,
    mapBookInfoCardContent,
    infoLabelDatePool,
    mapChapterPlaylistEntryItemPool,
    mapChapterPlaylistEntryNodePool,
    mapPlaylistNavigationButton
]

const poolDictionary = {};

for(const poolData of poolDataArray)
{
    const objectPool = [];

    for(let i = 0; i < poolData.size; i++)
    {
        const obj = thisBot.CreateNewObject({poolData: poolData});
        objectPool.push(obj);
    }
    poolDictionary[poolData.tag] = new Pool(
        {
            poolData: poolData,
            objectPool: objectPool,
            inUseObjects: []
        }
    )
}

thisBot.vars.poolDictionary = poolDictionary;