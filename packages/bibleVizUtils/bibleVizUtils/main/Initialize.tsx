let PoolData, CustomTag;

import {PieceInfo} from "bibleVizUtils.classes.PieceInfo"
import {StackBibleData} from "bibleVizUtils.classes.StackBibleData"
import {StackTestamentData} from "bibleVizUtils.classes.StackTestamentData"
import {StackSectionData} from "bibleVizUtils.classes.StackSectionData"
import {StackSectionBookData} from "bibleVizUtils.classes.StackSectionBookData"
import {StackBookData} from "bibleVizUtils.classes.StackBookData"
import {StackChapterData} from "bibleVizUtils.classes.StackChapterData"
import {LayoutChapterData} from "bibleVizUtils.classes.LayoutChapterData"
import {AnimateTagObject} from "bibleVizUtils.classes.AnimateTagObject"
import {LayoutBibleData} from "bibleVizUtils.classes.LayoutBibleData"
import {LayoutBookData} from "bibleVizUtils.classes.LayoutBookData"
import {LayoutBookStructure} from "bibleVizUtils.classes.LayoutBookStructure"
import {ParentDataIds} from "bibleVizUtils.classes.ParentDataIds"
import {QueuedChapterData} from "bibleVizUtils.classes.QueuedChapterData"
import {StackData} from "bibleVizUtils.classes.StackData"
import {TourGuideData} from "bibleVizUtils.classes.TourGuideData"
import {UnhighlightDelayInfo} from "bibleVizUtils.classes.UnhighlightDelayInfo"

globalThis.PieceInfo = PieceInfo;
globalThis.StackBibleData = StackBibleData;
globalThis.StackTestamentData = StackTestamentData;
globalThis.StackSectionData = StackSectionData;
globalThis.StackSectionBookData = StackSectionBookData;
globalThis.StackBookData = StackBookData;
globalThis.StackChapterData = StackChapterData;
globalThis.LayoutChapterData = LayoutChapterData;
globalThis.AnimateTagObject = AnimateTagObject;
globalThis.LayoutBibleData = LayoutBibleData;
globalThis.LayoutBookData = LayoutBookData;
globalThis.LayoutBookStructure = LayoutBookStructure;
globalThis.ParentDataIds = ParentDataIds;
globalThis.QueuedChapterData = QueuedChapterData;
globalThis.StackData = StackData;
globalThis.TourGuideData = TourGuideData;
globalThis.UnhighlightDelayInfo = UnhighlightDelayInfo;

const bibleVizClasses = getBot(byTag("system", "bibleVizUtils.classes"));
const bibleVizData = getBot(byTag("system", "bibleVizUtils.data"));
const bibleVizFunctions = getBot(byTag("system", "bibleVizUtils.functions"))

if(configBot.tags.systemPortal || thisBot.masks.initialized || typeof BibleVizUtils !== "undefined" || !bibleVizClasses || !bibleVizData || !bibleVizFunctions) return;

setTagMask(thisBot, "initialized", true);


// const shoutName = 'OnCameraRotationChanged';
// const gridBotOnBotChanged = gridPortalBot.tags.onBotChanged;
// if(!gridBotOnBotChanged?.includes?.(shoutName))
// {
//     const onBotChanged = `@const changedTags = that.tags;
// const cameraRotationChanged = changedTags.some((changedTag) => {
//     return changedTag === 'cameraRotationX' ||
//         changedTag === 'cameraRotationY' ||
//         changedTag === 'cameraRotationZ';
// })
// if (cameraRotationChanged) {
//     shout('${shoutName}', { changedTags })
// }
// `
//     const finalBotChanged = (gridBotOnBotChanged ?? "") + onBotChanged;
//     setTag(gridPortalBot, "onBotChanged", null);
//     setTag(gridPortalBot, "onBotChanged", finalBotChanged);
// }


globalThis.BibleVizUtils = {
    Classes: bibleVizClasses,
    Data: bibleVizData,
    Functions: bibleVizFunctions
}
const {HistoryTimePeriodInfo} = await import("bibleVizUtils.classes.HistoryTimePeriodInfo");

const nowTimePeriod = new HistoryTimePeriodInfo({color: "#ea42ea", isNowTimePeriod: true})
const defaultTimePeriod = new HistoryTimePeriodInfo({color: "#42ea6b", timeAmount: 30, timeUnit: bibleVizData.tags.TimeUnit.Days})


const UsersColorValues = {
    InfoLabelColorScales: {x: 0.5, y: 0.5, z: 0},
    InfoLabelExtraUsersContentScales: {x: 0.4, y: 0.4, z: 0},
    InfoLabelExtraUsersBackgroundScales: {x: 0.5, y: 0.5, z: 0},
    InfoLabelColorForm: "circle",
    InfoLabelColorOffset: new Vector3(0.25, 0, 0.1),
    InfoLabelColorStep: new Vector3(0.3, 0, 0.02),
    ChapterColorOffset: new Vector3(0.075, 0.075, 0),
    ChapterColorStep: new Vector3(0.275, 0, 0),
    GroundedElementColorScales: {x: 0.25, y: 0.25, z: 0.125},
    GroundedElementExtraUsersContentScales: {x: 0.2, y: 0.2, z: 0.125},
    GroundedElementExtraUsersBackgroundScales: {x: 0.25, y: 0.25, z: 0.03},
    GroundedElementColorForm: "sphere",
    MapBookColorOffset: {x: 0.1, y: 0.1, z: 0},
    MapBookColorStep: new Vector3(0.3, 0, 0),
}
const BibleLayoutMeasurements = {
    MaxAmountOfColumns: 7,
    Book3DMaxAmountOfColumns: 5,
    Chapter3DWidth: 0.5,
    Chapter3DHeight: 0.5,
    Chapter3DPadding: 0.1,
    Chapter3DGap: 0.1,
    BookHorizontalGap: 1,
    BookVerticalGap: 1,
    LayersVerticalGap: [3.5, 13.5, 21.625, 30.5, 43.5, 53.5, 57.5, 61.5, 68.5, 74],
    GapBetweenBookAndLine: 1.5,
    BookHorizontalOffset: 5,
    BookLabelHeight: 1,
    BookPositionZ: 1,
    ChapterInitialScaleZ: 0.15,
    ChapterSelectedScaleZ: 0.3,
    ChapterPlaylistItemDeltaHeight: 0.075,
    PlaylistNavigationButtonVerticalGap: 1,
    PlaylistStackedEntryItemGap: 0.0375,
    PlaylistEntryItemPadding: 0.01,
    
    Book2DMaxAmountOfColumns: 5
}
BibleLayoutMeasurements.Book3DScaleX = (BibleLayoutMeasurements.Book3DMaxAmountOfColumns * BibleLayoutMeasurements.Chapter3DWidth) + (BibleLayoutMeasurements.Chapter3DPadding * 2) + (BibleLayoutMeasurements.Chapter3DGap * (BibleLayoutMeasurements.Book3DMaxAmountOfColumns - 1))
const StackPieceMeasurements = {
    ChapterWidth: 0.5,
    ChapterHeight: 0.5,
    MinChapterBackDepth: 0.5,
    ChapterFrontDepth: 0.01,
    ChapterFrontSelectedDepth: 0.25,
    EmptySectionShadowScaleZ: 1,
    CoverScales: new Vector3(2.53, 3.85, 0.10),
    TestamentScales: new Vector3(2.27, 3.47, 0.825),
    SectionScales: new Vector2(2.04, 3.12),
    BookScales: new Vector2(1.83, 2.8),
    SectionAditionalScaleOnHover: 0.1,
    SectionDesiredScaleZRatio: 0.02,
    AditionalBookScaleOnHover: 0.1
}

setTag(bibleVizData, "UsersColorValues", UsersColorValues);
setTag(bibleVizData, "BibleLayoutMeasurements", BibleLayoutMeasurements);
setTag(bibleVizData, "StackPieceMeasurements", StackPieceMeasurements);
setTagMask(bibleVizData, "isInHistoryMode", false);
setTagMask(bibleVizData, 'highlightHistoryIndex', -1);
setTagMask(bibleVizData, "historyTimePeriodsInfo", [nowTimePeriod, defaultTimePeriod])
bibleVizData.vars.history = [];
bibleVizData.vars.highlightHistory = [];
bibleVizData.vars.customArrangements = [];
bibleVizData.vars.fixedArrangementsInfo = [];
bibleVizFunctions.UpdateFixedArrangementsInfo();

try {
    console.log(`[Debug] bibleVizUtils.main.Initialize`, {ob})
  ({ PoolData } = await import("objectPooler.main.PoolData"));
  ({ CustomTag } = await import("objectPooler.main.CustomTag"));
} 
catch (err) {
  console.warn("Module not found:", err);
}

if(PoolData && CustomTag)
{
    const infoLabelPool = new PoolData({
        tag: bibleVizData.tags.ObjectPoolTags.InfoLabel,
        bot: getBot(byTag("isBaseInfoLabel", true)),
        customTags: [
            new CustomTag({name: "isBaseInfoLabel", value: false}),
            new CustomTag({name: "isInfoLabel", value: true}),
            new CustomTag({name: "poolTag", value: bibleVizData.tags.ObjectPoolTags.InfoLabel}),
            new CustomTag({name: "system", value: null})
        ],
        size: 8
    })
    const infoLabelTailPool = new PoolData({
        tag: bibleVizData.tags.ObjectPoolTags.InfoLabelTail,
        bot: getBot(byTag("isBaseInfoLabelTail", true)),
        customTags: [
            new CustomTag({name: "isBaseInfoLabelTail", value: false}),
            new CustomTag({name: "isInfoLabelTail", value: true}),
            new CustomTag({name: "poolTag", value: bibleVizData.tags.ObjectPoolTags.InfoLabelTail}),
            new CustomTag({name: "system", value: null})
        ],
        size: 8
    })
    const infoLabelDatePool = new PoolData({
        tag: bibleVizData.tags.ObjectPoolTags.InfoLabelDate,
        bot: getBot("system", "bibleVizUtils.prefabs.infoLabelDate"),
        customTags: [
            new CustomTag({name: "poolTag", value: bibleVizData.tags.ObjectPoolTags.InfoLabelDate}),
            new CustomTag({name: "isInfoLabelDate", value: true}),
            new CustomTag({name: "system", value: null})
        ],
        size: 8
    })
    const infoLabelTransformerPool = new PoolData({
        tag: bibleVizData.tags.ObjectPoolTags.InfoLabelTransformer,
        bot: getBot(byTag("isBaseInfoLabelTransformer", true)),
        customTags: [
            new CustomTag({name: "isBaseInfoLabelTransformer", value: false}),
            new CustomTag({name: "isInfoLabelTransformer", value: true}),
            new CustomTag({name: "poolTag", value: bibleVizData.tags.ObjectPoolTags.InfoLabelTransformer}),
            new CustomTag({name: "system", value: null})
        ],
        size: 8
    })
    const userColorPool = new PoolData({
        tag: bibleVizData.tags.ObjectPoolTags.UserColor,
        bot:  getBot("system", "bibleVizUtils.prefabs.userColor"),
        customTags: [
            new CustomTag({name: "poolTag", value: bibleVizData.tags.ObjectPoolTags.UserColor}),
            new CustomTag({name: "isUserColor", value: true}),
            new CustomTag({name: "system", value: null})
        ],
        size: 8
    })
    const activityNotificationPool = new PoolData({
        tag: bibleVizData.tags.ObjectPoolTags.ActivityNotification,
        bot: getBot("system", "bibleVizUtils.prefabs.activityNotification"),
        customTags: [
            new CustomTag({name: "poolTag", value: bibleVizData.tags.ObjectPoolTags.ActivityNotification}),
            new CustomTag({name: "system", value: null})
        ],
        size: 5
    })

    ObjectPooler.AddObjectPools({
        poolsData: [
            infoLabelPool,
            infoLabelTailPool,
            infoLabelDatePool,
            infoLabelTransformerPool,
            userColorPool,
            activityNotificationPool
        ]
    })
}