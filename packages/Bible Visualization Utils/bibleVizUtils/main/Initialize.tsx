let BibleVizDataRepository;
let ObjectPoolTags;

let PoolData;
let CustomTag;

const bibleVizAdapters = getBot(byTag("system", "bibleVizUtils.adapters"));
const bibleVizLabelController = getBot(
  byTag("system", "bibleVizUtils.controllers.label")
);
const bibleVizRenderController = getBot(
  byTag("system", "bibleVizUtils.controllers.render")
);
const bibleVizUserPresenceController = getBot(
  byTag("system", "bibleVizUtils.controllers.userPresence")
);
const bibleVizData = getBot(byTag("system", "bibleVizUtils.data"));
const bibleVizFunctions = getBot(byTag("system", "bibleVizUtils.functions"));
const bibleVizModels = getBot(byTag("system", "bibleVizUtils.models"));
const bibleVizEntities = getBot(
  byTag("system", "bibleVizUtils.models.entities")
);
const bibleVizServices = getBot(byTag("system", "bibleVizUtils.services"));

if (
  configBot.tags.systemPortal ||
  thisBot.masks.initialized ||
  typeof BibleVizUtils !== "undefined" ||
  !bibleVizData ||
  !bibleVizFunctions ||
  !bibleVizServices ||
  !bibleVizAdapters ||
  !bibleVizLabelController ||
  !bibleVizRenderController ||
  !bibleVizUserPresenceController ||
  !bibleVizModels ||
  !bibleVizEntities ||
  !globalThis.ObjectPooler
) {
  return;
}

setTagMask(thisBot, "initialized", true);

globalThis.BibleVizUtils = {
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

  ({ BibleVizDataRepository } =
    await import("bibleVizUtils.data.BibleVizDataRepository"));
  ({ ObjectPoolTags } = await import("bibleVizUtils.models.canvas"));
} catch (err) {
  console.warn("Module not found:", err);
}

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

const UsersColorValues = {
  LabelScales: { x: 0.5, y: 0.5, z: 0 },
  InfoLabelExtraUsersContentScales: { x: 0.4, y: 0.4, z: 0 },
  InfoLabelExtraUsersBackgroundScales: { x: 0.5, y: 0.5, z: 0 },
  InfoLabelColorForm: "circle",
  LabelOffset: new Vector3(0.25, 0, 0.1),
  LabelStep: new Vector3(0.3, 0, 0.02),
  ChapterOffset: new Vector3(0.075, 0.075, 0),
  ChapterStep: new Vector3(0.275, 0, 0),
  GroundedScales: { x: 0.25, y: 0.25, z: 0.125 },
  GroundedElementExtraUsersContentScales: { x: 0.2, y: 0.2, z: 0.125 },
  GroundedElementExtraUsersBackgroundScales: { x: 0.25, y: 0.25, z: 0.03 },
  GroundedElementColorForm: "sphere",
  ScriptureMapBookOffset: { x: 0.1, y: 0.1, z: 0 },
  ScriptureMapBookStep: new Vector3(0.3, 0, 0),
};

setTag(bibleVizData, "UsersColorValues", UsersColorValues);
setTagMask(bibleVizData, "isInHistoryMode", false);
setTagMask(bibleVizData, "highlightHistoryIndex", -1);
// setTagMask(bibleVizData, "historyTimePeriodsInfo", historyTimePeriodsInfo);

bibleVizData.vars.history = [];
bibleVizData.vars.highlightHistory = [];
BibleVizDataRepository?.setCustomArrangements([]);

if (PoolData && CustomTag && ObjectPoolTags) {
  const infoLabelPool = new PoolData({
    tag: ObjectPoolTags.InfoLabel,
    bot: getBot(byTag("isBaseInfoLabel", true)),
    customTags: [
      new CustomTag({ name: "isBaseInfoLabel", value: false }),
      new CustomTag({ name: "isInfoLabel", value: true }),
      new CustomTag({
        name: "poolTag",
        value: ObjectPoolTags.InfoLabel,
      }),
      new CustomTag({ name: "system", value: null }),
    ],
    size: 8,
  });
  const infoLabelTailPool = new PoolData({
    tag: ObjectPoolTags.InfoLabelTail,
    bot: getBot(byTag("isBaseInfoLabelTail", true)),
    customTags: [
      new CustomTag({ name: "isBaseInfoLabelTail", value: false }),
      new CustomTag({ name: "isInfoLabelTail", value: true }),
      new CustomTag({
        name: "poolTag",
        value: ObjectPoolTags.InfoLabelTail,
      }),
      new CustomTag({ name: "system", value: null }),
    ],
    size: 8,
  });
  const infoLabelDatePool = new PoolData({
    tag: ObjectPoolTags.InfoLabelDate,
    bot: getBot("system", "bibleVizUtils.prefabs.infoLabelDate"),
    customTags: [
      new CustomTag({
        name: "poolTag",
        value: ObjectPoolTags.InfoLabelDate,
      }),
      new CustomTag({ name: "isInfoLabelDate", value: true }),
      new CustomTag({ name: "system", value: null }),
    ],
    size: 8,
  });
  const infoLabelTransformerPool = new PoolData({
    tag: ObjectPoolTags.InfoLabelTransformer,
    bot: getBot(byTag("isBaseInfoLabelTransformer", true)),
    customTags: [
      new CustomTag({ name: "isBaseInfoLabelTransformer", value: false }),
      new CustomTag({ name: "isInfoLabelTransformer", value: true }),
      new CustomTag({
        name: "poolTag",
        value: ObjectPoolTags.InfoLabelTransformer,
      }),
      new CustomTag({ name: "system", value: null }),
    ],
    size: 8,
  });
  const userColorPool = new PoolData({
    tag: ObjectPoolTags.ActivityIndicator,
    bot: getBot("system", "bibleVizUtils.prefabs.userColor"),
    customTags: [
      new CustomTag({
        name: "poolTag",
        value: ObjectPoolTags.ActivityIndicator,
      }),
      new CustomTag({ name: "isUserColor", value: true }),
      new CustomTag({ name: "system", value: null }),
    ],
    size: 8,
  });
  const activityNotificationPool = new PoolData({
    tag: ObjectPoolTags.ActivityNotification,
    bot: getBot("system", "bibleVizUtils.prefabs.activityNotification"),
    customTags: [
      new CustomTag({
        name: "poolTag",
        value: ObjectPoolTags.ActivityNotification,
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
