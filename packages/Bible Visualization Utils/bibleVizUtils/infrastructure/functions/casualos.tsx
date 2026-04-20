import type {
  Bot,
  Vector3 as Vector3Type,
} from "../../../../../typings/AuxLibraryDefinitions";
import type {
  AnimateTagData,
  SetTagData,
  TypedBot,
} from "bibleVizUtils.infrastructure.models.casualos";

type DistanceBetweenBotAndCameraType = (params: { bot: Bot }) => number;

type ComputeAnimateTagType = (obj: AnimateTagData) => Promise<void>;
type ApplySetTagType = (obj: SetTagData) => void;
type GetBotScalesType = (bot: Bot) => { x: number; y: number; z: number };
type GetTransformedScalesType = (bot: Bot) => {
  x: number;
  y: number;
  z: number;
};
type GetTransformedPositionType = (bot: Bot, dimension: string) => Vector3Type;

export const DistanceBetweenBotAndCamera: DistanceBetweenBotAndCameraType = ({
  bot,
}) => {
  const cameraPosition = os.getCameraPosition("grid");
  const dimension = os.getCurrentDimension();

  const botPosition = new Vector3(
    bot.masks?.[dimension + "X"] ?? bot.tags[dimension + "X"],
    bot.masks?.[dimension + "Y"] ?? bot.tags[dimension + "Y"],
    bot.masks?.[dimension + "Z"] ?? bot.tags[dimension + "Z"]
  );
  const distance = Vector3.distanceBetween(botPosition, cameraPosition);
  return distance;
};

export const computeAnimateTag: ComputeAnimateTagType = ({
  bot,
  tag,
  options,
  then,
}) => {
  const animateFn = tag
    ? animateTag(bot, tag, options)
    : animateTag(bot, options);
  return animateFn.then(() => {
    if (then) {
      return computeAnimateTag(then);
    }
  });
};

export const applySetTag: ApplySetTagType = ({ bot, tag, options, then }) => {
  setTag(bot, tag, options.toValue);
  if (then) {
    applySetTag(then);
  }
};

export const GetBotScales: GetBotScalesType = (bot) => {
  const scales = {
    x: bot.masks.scaleX ?? bot.tags.scaleX ?? 1,
    y: bot.masks.scaleY ?? bot.tags.scaleY ?? 1,
    z: bot.masks.scaleZ ?? bot.tags.scaleZ ?? 1,
  };

  return scales;
};

export const GetTransformedScales: GetTransformedScalesType = (bot) => {
  const botScale = bot.masks.scale ?? bot.tags.scale ?? 1;
  const botScales = GetBotScales(bot);
  botScales.x *= botScale;
  botScales.y *= botScale;
  botScales.z *= botScale;

  const transformerId = bot.masks.transformer ?? bot.tags.transformer;
  if (transformerId) {
    const transformer = getBot(byID(transformerId));
    if (transformer) {
      const transformerScale =
        transformer.masks.scale ?? transformer.tags.scale ?? 1;
      const transformerScales = GetBotScales(transformer);
      botScales.x *= transformerScales.x * transformerScale;
      botScales.y *= transformerScales.y * transformerScale;
      botScales.z *= transformerScales.z * transformerScale;
    }
  }
  return botScales;
};

export const GetTransformedPosition: GetTransformedPositionType = (
  bot,
  dimension
) => {
  const position = getBotPosition(bot, dimension);
  const transformerId = bot.masks.transformer ?? bot.tags.transformer;
  if (transformerId) {
    const transformer = getBot(byID(transformerId));
    if (transformer) {
      const transformerScale =
        transformer.masks.scale ?? transformer.tags.scale ?? 1;
      const transformerScales = GetBotScales(transformer);
      position.x += transformerScales.x * transformerScale;
      position.y += transformerScales.y * transformerScale;
      position.z += transformerScales.z * transformerScale;
    }
  }
  return position;
};

export const MakePortalFree = () => {
  setTagMask(gridPortalBot, "portalPannable", true);
  setTagMask(gridPortalBot, "portalZoomable", true);
  setTagMask(gridPortalBot, "portalRotatable", true);
};

export const MakePortalRestrict = () => {
  setTagMask(gridPortalBot, "portalPannable", false);
  setTagMask(gridPortalBot, "portalZoomable", false);
  setTagMask(gridPortalBot, "portalRotatable", false);
};

export const SetStrictTag = <
  B extends TypedBot<any>,
  K extends keyof B["tags"],
>(
  bot: B,
  tag: K,
  value: B["tags"][K]
) => {
  setTag(bot, tag as string, value);
};
