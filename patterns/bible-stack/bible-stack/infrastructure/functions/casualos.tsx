import type {
  AnimateTagFunctionOptions,
  Bot,
  Vector3 as Vector3Type,
} from "../../../../pattern-typings/AuxLibraryDefinitions";
import type { AnimateTagData, SetTagData, TypedBot } from "../models/casualos";

type GetCamRotationFocusPointType = (params: {
  theta: number;
  phi: number;
  botPosition: Vector3Type;
}) => Vector3Type;

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
    return Promise.resolve();
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  B extends TypedBot<any>,
  K extends keyof B["tags"],
>(
  bot: B | B[],
  tag: K,
  value: B["tags"][K]
) => {
  setTag(bot, tag as string, value);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ApplyStrictMod<B extends TypedBot<any>>(
  bot: B | undefined,
  mod: Partial<B["tags"]>
) {
  if (bot) applyMod(bot, mod);
}

// Overload 1: animate a single tag — animateTag(bot, tag, options).
export function AnimateStrictTag<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  B extends TypedBot<any>,
  K extends keyof B["tags"],
>(
  bot: B | B[],
  tag: K,
  options: Omit<AnimateTagFunctionOptions, "fromValue" | "toValue"> & {
    fromValue?: B["tags"][K];
    toValue: B["tags"][K];
  }
): Promise<void>;
// Overload 2: animate several tags at once — animateTag(bot, options), where
// fromValue/toValue are objects of tag values.
export function AnimateStrictTag<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  B extends TypedBot<any>,
>(
  bot: B | B[],
  options: Omit<AnimateTagFunctionOptions, "fromValue" | "toValue"> & {
    fromValue?: Partial<B["tags"]>;
    toValue: Partial<B["tags"]>;
  }
): Promise<void>;
export function AnimateStrictTag<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  B extends TypedBot<any>,
  K extends keyof B["tags"],
>(
  bot: B | B[],
  tagOrOptions:
    | K
    | (Omit<AnimateTagFunctionOptions, "fromValue" | "toValue"> & {
        fromValue?: Partial<B["tags"]>;
        toValue: Partial<B["tags"]>;
      }),
  options?: Omit<AnimateTagFunctionOptions, "fromValue" | "toValue"> & {
    fromValue?: B["tags"][K];
    toValue: B["tags"][K];
  }
): Promise<void> {
  // The native animateTag is poorly typed; the strict overloads above are the
  // contract callers see, so the implementation passes through.
  return animateTag(
    bot,
    tagOrOptions as string | AnimateTagFunctionOptions,
    options
  );
}

export const GetCamRotationFocusPoint: GetCamRotationFocusPointType = ({
  theta,
  phi,
  botPosition,
}) => {
  const x = Math.sin(phi) * Math.cos(theta + math.degreesToRadians(270));
  const y = Math.sin(phi) * Math.sin(theta + math.degreesToRadians(270));
  const z = Math.cos(phi);
  const camDesiredForwardDirection = new Vector3(x, y, z).negate().normalize();
  const camDesiredForwardDirectionXY = new Vector3(
    camDesiredForwardDirection.x,
    camDesiredForwardDirection.y,
    0
  ).normalize();
  const vectorZ = new Vector3(0, 0, camDesiredForwardDirection.z > 0 ? 1 : -1);
  const angleBetween =
    math.degreesToRadians(90) -
    Vector3.angleBetween(camDesiredForwardDirection, vectorZ);
  const vectorMagnitude = botPosition.z / Math.tan(angleBetween);
  const desiredFocusOnPosition = new Vector3(
    botPosition.x,
    botPosition.y,
    0
  ).add(camDesiredForwardDirectionXY.multiplyScalar(vectorMagnitude));
  return desiredFocusOnPosition;
};
