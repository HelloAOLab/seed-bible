let BibleVizDataRepository;

let PoolData;
let CustomTag;
let PieceInfo;
let StackBibleData;
let StackTestamentData;
let StackSectionData;
let StackSectionBookData;
let StackBookData;
let StackChapterData;
let LayoutChapterData;
let AnimateTagObject;
let LayoutBibleData;
let LayoutBookData;
let LayoutBookStructure;
let ParentDataIds;
let QueuedChapterData;
let StackData;
let TourGuideData;
let UnhighlightDelayInfo;

const bibleVizClasses = getBot(byTag("system", "bibleVizUtils.classes"));
const bibleVizData = getBot(byTag("system", "bibleVizUtils.data"));
const bibleVizFunctions = getBot(byTag("system", "bibleVizUtils.functions"));
const bibleVizServices = getBot(byTag("system", "bibleVizUtils.services"));

if (
  configBot.tags.systemPortal ||
  thisBot.masks.initialized ||
  typeof BibleVizUtils !== "undefined" ||
  !bibleVizClasses ||
  !bibleVizData ||
  !bibleVizFunctions ||
  !bibleVizServices ||
  !globalThis.ObjectPooler
)
  return;

setTagMask(thisBot, "initialized", true);

globalThis.BibleVizUtils = {
  Classes: bibleVizClasses,
  Data: bibleVizData,
  Functions: bibleVizFunctions,
  Services: bibleVizServices,
  Main: thisBot,
};

if (authBot) {
  try {
    const { sessionService } = await import("bibleVizUtils.services.index");
    sessionService.tryEmitUserLoggedInEvent(authBot);
  } catch (error) {
    console.error(error);
  }
}

try {
  ({ PoolData } = await import("objectPooler.main.PoolData"));
  ({ CustomTag } = await import("objectPooler.main.CustomTag"));
  ({ PieceInfo } = await import("bibleVizUtils.classes.PieceInfo"));
  ({ StackBibleData } = await import("bibleVizUtils.classes.StackBibleData"));
  ({ StackTestamentData } =
    await import("bibleVizUtils.classes.StackTestamentData"));
  ({ StackSectionData } =
    await import("bibleVizUtils.classes.StackSectionData"));
  ({ StackSectionBookData } =
    await import("bibleVizUtils.classes.StackSectionBookData"));
  ({ StackBookData } = await import("bibleVizUtils.classes.StackBookData"));
  ({ StackChapterData } =
    await import("bibleVizUtils.classes.StackChapterData"));
  ({ LayoutChapterData } =
    await import("bibleVizUtils.classes.LayoutChapterData"));
  ({ AnimateTagObject } =
    await import("bibleVizUtils.classes.AnimateTagObject"));
  ({ LayoutBibleData } = await import("bibleVizUtils.classes.LayoutBibleData"));
  ({ LayoutBookData } = await import("bibleVizUtils.classes.LayoutBookData"));
  ({ LayoutBookStructure } =
    await import("bibleVizUtils.classes.LayoutBookStructure"));
  ({ ParentDataIds } = await import("bibleVizUtils.classes.ParentDataIds"));
  ({ QueuedChapterData } =
    await import("bibleVizUtils.classes.QueuedChapterData"));
  ({ StackData } = await import("bibleVizUtils.classes.StackData"));
  ({ TourGuideData } = await import("bibleVizUtils.classes.TourGuideData"));
  ({ UnhighlightDelayInfo } =
    await import("bibleVizUtils.classes.UnhighlightDelayInfo"));

  ({ BibleVizDataRepository } =
    await import("bibleVizUtils.data.BibleVizDataRepository"));
} catch (err) {
  console.warn("Module not found:", err);
}

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

const { HistoryTimePeriodInfo } =
  await import("bibleVizUtils.classes.HistoryTimePeriodInfo");

// const historyTimePeriodsInfo = [
//   new HistoryTimePeriodInfo({ value: 1, isNowTimePeriod: true }),
//   new HistoryTimePeriodInfo({
//     value: 1,
//     timeAmount: 1,
//     timeUnit: bibleVizData.tags.TimeUnit.Days,
//   }),
//   new HistoryTimePeriodInfo({
//     value: 0.9,
//     timeAmount: 2,
//     timeUnit: bibleVizData.tags.TimeUnit.Days,
//   }),
//   new HistoryTimePeriodInfo({
//     value: 0.8,
//     timeAmount: 3,
//     timeUnit: bibleVizData.tags.TimeUnit.Days,
//   }),
//   new HistoryTimePeriodInfo({
//     value: 0.7,
//     timeAmount: 4,
//     timeUnit: bibleVizData.tags.TimeUnit.Days,
//   }),
//   new HistoryTimePeriodInfo({
//     value: 0.6,
//     timeAmount: 5,
//     timeUnit: bibleVizData.tags.TimeUnit.Days,
//   }),
//   new HistoryTimePeriodInfo({
//     value: 0.5,
//     timeAmount: 6,
//     timeUnit: bibleVizData.tags.TimeUnit.Days,
//   }),
//   new HistoryTimePeriodInfo({
//     value: 0.4,
//     timeAmount: 7,
//     timeUnit: bibleVizData.tags.TimeUnit.Days,
//   }),
//   new HistoryTimePeriodInfo({
//     value: 0.3,
//     timeAmount: 8,
//     timeUnit: bibleVizData.tags.TimeUnit.Days,
//   }),
//   new HistoryTimePeriodInfo({
//     value: 0.2,
//     timeAmount: 9,
//     timeUnit: bibleVizData.tags.TimeUnit.Days,
//   }),
//   new HistoryTimePeriodInfo({
//     value: 0.1,
//     timeAmount: 10,
//     timeUnit: bibleVizData.tags.TimeUnit.Days,
//   }),
//   new HistoryTimePeriodInfo({
//     value: 0,
//     timeAmount: 11,
//     timeUnit: bibleVizData.tags.TimeUnit.Days,
//   }),
// ];

const UsersColorValues = {
  InfoLabelColorScales: { x: 0.5, y: 0.5, z: 0 },
  InfoLabelExtraUsersContentScales: { x: 0.4, y: 0.4, z: 0 },
  InfoLabelExtraUsersBackgroundScales: { x: 0.5, y: 0.5, z: 0 },
  InfoLabelColorForm: "circle",
  InfoLabelColorOffset: new Vector3(0.25, 0, 0.1),
  InfoLabelColorStep: new Vector3(0.3, 0, 0.02),
  ChapterColorOffset: new Vector3(0.075, 0.075, 0),
  ChapterColorStep: new Vector3(0.275, 0, 0),
  GroundedElementColorScales: { x: 0.25, y: 0.25, z: 0.125 },
  GroundedElementExtraUsersContentScales: { x: 0.2, y: 0.2, z: 0.125 },
  GroundedElementExtraUsersBackgroundScales: { x: 0.25, y: 0.25, z: 0.03 },
  GroundedElementColorForm: "sphere",
  MapBookColorOffset: { x: 0.1, y: 0.1, z: 0 },
  MapBookColorStep: new Vector3(0.3, 0, 0),
};

setTag(bibleVizData, "UsersColorValues", UsersColorValues);
setTagMask(bibleVizData, "isInHistoryMode", false);
setTagMask(bibleVizData, "highlightHistoryIndex", -1);
// setTagMask(bibleVizData, "historyTimePeriodsInfo", historyTimePeriodsInfo);

bibleVizData.vars.history = [];
bibleVizData.vars.highlightHistory = [];
bibleVizData.vars.customArrangements = [];
BibleVizDataRepository?.setCustomArrangements([]);
bibleVizData.vars.fixedArrangementsInfo = [];
// bibleVizFunctions.UpdateFixedArrangementsInfo();

if (PoolData && CustomTag) {
  const infoLabelPool = new PoolData({
    tag: bibleVizData.tags.ObjectPoolTags.InfoLabel,
    bot: getBot(byTag("isBaseInfoLabel", true)),
    customTags: [
      new CustomTag({ name: "isBaseInfoLabel", value: false }),
      new CustomTag({ name: "isInfoLabel", value: true }),
      new CustomTag({
        name: "poolTag",
        value: bibleVizData.tags.ObjectPoolTags.InfoLabel,
      }),
      new CustomTag({ name: "system", value: null }),
    ],
    size: 8,
  });
  const infoLabelTailPool = new PoolData({
    tag: bibleVizData.tags.ObjectPoolTags.InfoLabelTail,
    bot: getBot(byTag("isBaseInfoLabelTail", true)),
    customTags: [
      new CustomTag({ name: "isBaseInfoLabelTail", value: false }),
      new CustomTag({ name: "isInfoLabelTail", value: true }),
      new CustomTag({
        name: "poolTag",
        value: bibleVizData.tags.ObjectPoolTags.InfoLabelTail,
      }),
      new CustomTag({ name: "system", value: null }),
    ],
    size: 8,
  });
  const infoLabelDatePool = new PoolData({
    tag: bibleVizData.tags.ObjectPoolTags.InfoLabelDate,
    bot: getBot("system", "bibleVizUtils.prefabs.infoLabelDate"),
    customTags: [
      new CustomTag({
        name: "poolTag",
        value: bibleVizData.tags.ObjectPoolTags.InfoLabelDate,
      }),
      new CustomTag({ name: "isInfoLabelDate", value: true }),
      new CustomTag({ name: "system", value: null }),
    ],
    size: 8,
  });
  const infoLabelTransformerPool = new PoolData({
    tag: bibleVizData.tags.ObjectPoolTags.InfoLabelTransformer,
    bot: getBot(byTag("isBaseInfoLabelTransformer", true)),
    customTags: [
      new CustomTag({ name: "isBaseInfoLabelTransformer", value: false }),
      new CustomTag({ name: "isInfoLabelTransformer", value: true }),
      new CustomTag({
        name: "poolTag",
        value: bibleVizData.tags.ObjectPoolTags.InfoLabelTransformer,
      }),
      new CustomTag({ name: "system", value: null }),
    ],
    size: 8,
  });
  const userColorPool = new PoolData({
    tag: bibleVizData.tags.ObjectPoolTags.UserColor,
    bot: getBot("system", "bibleVizUtils.prefabs.userColor"),
    customTags: [
      new CustomTag({
        name: "poolTag",
        value: bibleVizData.tags.ObjectPoolTags.UserColor,
      }),
      new CustomTag({ name: "isUserColor", value: true }),
      new CustomTag({ name: "system", value: null }),
    ],
    size: 8,
  });
  const activityNotificationPool = new PoolData({
    tag: bibleVizData.tags.ObjectPoolTags.ActivityNotification,
    bot: getBot("system", "bibleVizUtils.prefabs.activityNotification"),
    customTags: [
      new CustomTag({
        name: "poolTag",
        value: bibleVizData.tags.ObjectPoolTags.ActivityNotification,
      }),
      new CustomTag({ name: "system", value: null }),
    ],
    size: 5,
  });

  ObjectPooler.AddObjectPools({
    poolsData: [
      infoLabelPool,
      infoLabelTailPool,
      infoLabelDatePool,
      infoLabelTransformerPool,
      userColorPool,
      activityNotificationPool,
    ],
  });
}

shout("OnBibleVizUtilsInitialized");
