import { HexToRgb } from "bibleVizUtils.functions.index";

const { bot, cameraFocus } = that;

// const baseGlow = getBot("system", "tabernacle.glow");
const baseCone = getBot("system", "tabernacle.cone");
const dimension = os.getCurrentDimension();
const blinkDuration = 1;
// const glowTargetFormOpacity = 0.4;
const coneTargetFormOpacity = 0.75;
const botPosition = getBotPosition(bot, dimension);

const botsToSetState = {};
for (const { key } of bot.tags.keysStateOnHighlight ?? []) {
  const botToSetState = getBot("system", `tabernacle.${key}`);
  botsToSetState[key] = botToSetState;
}

const duration = 1;
const easing = { type: "sinusoidal", mode: "inout" };
const rotation = { x: 1.01229, y: 0.5 };
const startTime =
  os.localTime +
  (bot.tags.keysStateOnHighlight?.some(({ state, key }) => {
    return (
      state === MeshState.Hidden &&
      botsToSetState[key]?.masks.state !== MeshState.Hidden
    );
  })
    ? 1000
    : 0);

const cone =
  bot.tags.showHighlightCone &&
  create(baseCone, {
    space: "tempLocal",
    parentId: bot.id,
    pointable: false,
    [dimension]: true,
    [dimension + "X"]:
      botPosition.x + (bot.tags.coneOffset ? bot.tags.coneOffset.x : 0),
    [dimension + "Y"]:
      botPosition.y + (bot.tags.coneOffset ? bot.tags.coneOffset.y : 0),
    [dimension + "Z"]:
      botPosition.z +
      (bot.tags.coneOffset ? bot.tags.coneOffset.z : 0) +
      (bot.tags.scaleZ ?? 1) * (bot.tags.scale ?? 1) +
      baseCone.tags.scaleZ * baseCone.tags.targetScale,
    [dimension + "RotationX"]: 3.141593,
    isCone: true,
    system: null,
    scale: baseCone.tags.targetScale,
  });

const showBot =
  bot.masks.state === MeshState.Hidden ||
  bot.masks.state === MeshState.Translucent;

return Promise.all([
  showBot &&
    thisBot.SetBotsVisibility({
      data: [{ key: bot.tags.key, value: MeshState.Shown }],
    }),
  cameraFocus &&
    os.focusOn(bot, {
      duration,
      easing,
      rotation,
      zoom: 40,
    }),
  ColorLerper.LerpTag({
    startingColor: HexToRgb({ hexColor: "#ffffff" }),
    endingColor: HexToRgb({ hexColor: "#8df5f3" }),
    durationInSeconds: blinkDuration / 2,
    bot,
    tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
  }).then(() => {
    return ColorLerper.LerpTag({
      endingColor: HexToRgb({ hexColor: "#ffffff" }),
      durationInSeconds: blinkDuration / 2,
      bot,
      tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
    });
  }),
  bot.tags.showHighlightCone &&
    animateTag(cone, "formOpacity", {
      duration: blinkDuration / 2,
      easing,
      toValue: coneTargetFormOpacity,
      startTime,
    }).then(() => {
      return animateTag(cone, "formOpacity", {
        duration: blinkDuration / 2,
        easing,
        toValue: 0,
        startTime: os.localTime + blinkDuration * 2000,
      });
    }),
  ...(bot.tags.keysStateOnHighlight?.map((info) => {
    const { key, state } = info;
    return thisBot.SetBotsVisibility({ data: [{ key, value: state }] });
  }) ?? []),
]).finally(() => {
  destroy([cone]);
});
