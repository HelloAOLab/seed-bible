import { GetBotScales } from "bibleVizUtils.functions.index";
import { PieceActivityService } from "bibleVizUtils.services.PieceActivityService";
import type {
  Bot,
  Point3D,
  Vector3 as Vector3Type,
} from "../../../../../typings/AuxLibraryDefinitions";
import {
  ObjectPoolTags,
  type ObjectPoolTagsType,
} from "bibleVizUtils.models.enums";
import {
  ActivityIndicatorDefaults,
  type ActivityIndicatorDefaultsType,
} from "bibleVizUtils.data.ActivityIndicatorDefaults";
import { PieceDataRegistry } from "bibleVizUtils.services.PieceDataRegistry";
import type { Tab } from "bibleVizUtils.models.interfaces";
import { userPresenceService } from "bibleVizUtils.services.UserPresenceService";
import { userColorStore } from "bibleVizUtils.services.UserColorStore";

interface PositionStrategyParams {
  piece: Bot;
  indicator: Bot;
  dimension: string;
}

type PositionStrategyType = (params: PositionStrategyParams) => Vector3Type;

const labelPositionStrategy: PositionStrategyType = ({ piece, indicator }) => {
  const offset = ActivityIndicatorDefaults.LabelOffset;
  const step = ActivityIndicatorDefaults.LabelStep;
  const { infoLabel }: { infoLabel: Bot } = piece.GetLabelElements();
  const piecePosition: Vector3Type | undefined = infoLabel.tags.initialPosition;
  if (!piecePosition) {
    throw new Error(
      "Piece position is undefined at activityIndicatorsController"
    );
  }
  const pieceScales = GetBotScales(infoLabel);
  const position = new Vector3(
    piecePosition.x -
      pieceScales.x / 2 +
      ActivityIndicatorDefaults.LabelScales.x / 2 +
      offset.x +
      indicator.tags.activityIndex * step.x,
    piecePosition.y + pieceScales.y / 2,
    piecePosition.z +
      pieceScales.z +
      offset.z +
      indicator.tags.activityIndex *
        (step.z * (indicator.tags.isExtraContent ? 2 : 1)) +
      (indicator.tags.isExtraContent ? step.z : 0)
  );
  return position;
};

const createPositionGroundedStrategy = (offset: Point3D, step: Point3D) => {
  const strategy: PositionStrategyType = ({ piece, indicator, dimension }) => {
    const piecePosition = getBotPosition(piece, dimension);
    const pieceScales = GetBotScales(piece);

    return new Vector3(
      piecePosition.x -
        pieceScales.x / 2 +
        ActivityIndicatorDefaults.GroundedScales.x / 2 +
        offset.x +
        indicator.tags.activityIndex * step.x,
      piecePosition.y +
        pieceScales.y / 2 -
        ActivityIndicatorDefaults.GroundedScales.y / 2 -
        offset.y,
      piecePosition.z + pieceScales.z - indicator.tags.scaleZ / 2
    );
  };
  return strategy;
};

const positionStrategiesMap: Record<string, PositionStrategyType> = {
  [ObjectPoolTags.InfoLabelTransformer]: labelPositionStrategy,
  [ObjectPoolTags.StackChapter]: createPositionGroundedStrategy(
    ActivityIndicatorDefaults.ChapterOffset,
    ActivityIndicatorDefaults.ChapterStep
  ),
  [ObjectPoolTags.LayoutChapter]: createPositionGroundedStrategy(
    ActivityIndicatorDefaults.ChapterOffset,
    ActivityIndicatorDefaults.ChapterStep
  ),
  [ObjectPoolTags.LayoutBook]: createPositionGroundedStrategy(
    ActivityIndicatorDefaults.ScriptureMapBookOffset,
    ActivityIndicatorDefaults.ScriptureMapBookStep
  ),
};

export const updateIndicatorsPosition: (piece: Bot) => void = (piece) => {
  const strategy = positionStrategiesMap[piece.tags.poolTag];

  if (!strategy)
    throw new Error(
      `Strategy not found for ${piece.tags.poolTag} at activityIndicatorsController.updateIndicatorsPosition`
    );

  const currIndicators =
    PieceActivityService.getActivityIndicatorsForPiece(piece);
  const dimension = os.getCurrentDimension();

  currIndicators.forEach((indicator) => {
    const position = strategy({ piece, indicator, dimension });
    setTag(indicator, dimension + "X", position.x);
    setTag(indicator, dimension + "Y", position.y);
    setTag(indicator, dimension + "Z", position.z);
    setTag(indicator, "initialPosition", position);
  });
};

export const tryHideIndicators: (piece: Bot) => void = (piece) => {
  const currIndicators =
    PieceActivityService.getActivityIndicatorsForPiece(piece);
  if (currIndicators.length > 0) {
    ObjectPooler.ReleaseObject({
      obj: currIndicators,
      tag: currIndicators[0]?.tags.poolTag,
    });
  }
};

type UpdateStrategyType = (piece: Bot) => {
  selectionsPiece: Bot | Bot[] | undefined;
  indicatorScales:
    | ActivityIndicatorDefaultsType["LabelScales"]
    | ActivityIndicatorDefaultsType["GroundedScales"];
  extraContentScales:
    | ActivityIndicatorDefaultsType["LabelExtraUsersContentScales"]
    | ActivityIndicatorDefaultsType["GroundedExtraUsersContentScales"];
  extraBackgroundScales:
    | ActivityIndicatorDefaultsType["LabelExtraUsersBackgroundScales"]
    | ActivityIndicatorDefaultsType["GroundedExtraUsersBackgroundScales"];
  form:
    | ActivityIndicatorDefaultsType["LabelForm"]
    | ActivityIndicatorDefaultsType["GroundedForm"];
  pieceData?: undefined | { id: string };
};

const updateLabelStrategy: UpdateStrategyType = (piece) => {
  const selectionsPiece = piece.links.ownerBot;
  const indicatorScales = ActivityIndicatorDefaults.LabelScales;
  const extraContentScales =
    ActivityIndicatorDefaults.LabelExtraUsersContentScales;
  const extraBackgroundScales =
    ActivityIndicatorDefaults.LabelExtraUsersBackgroundScales;
  const form = ActivityIndicatorDefaults.LabelForm;

  return {
    selectionsPiece,
    indicatorScales,
    extraContentScales,
    extraBackgroundScales,
    form,
  };
};

const updatePieceStrategy: UpdateStrategyType = (piece) => {
  const pieceData = PieceDataRegistry.getPieceData(piece);
  const selectionsPiece = piece;
  const indicatorScales = ActivityIndicatorDefaults.GroundedScales;
  const extraContentScales =
    ActivityIndicatorDefaults.GroundedExtraUsersContentScales;
  const extraBackgroundScales =
    ActivityIndicatorDefaults.GroundedExtraUsersBackgroundScales;
  const form = ActivityIndicatorDefaults.GroundedForm;

  return {
    pieceData,
    selectionsPiece,
    indicatorScales,
    extraContentScales,
    extraBackgroundScales,
    form,
  };
};

const updateStrategiesMap: Record<string, UpdateStrategyType> = {
  [ObjectPoolTags.InfoLabelTransformer]: updateLabelStrategy,
  [ObjectPoolTags.StackChapter]: updatePieceStrategy,
  [ObjectPoolTags.LayoutBook]: updatePieceStrategy,
  [ObjectPoolTags.LayoutChapter]: updatePieceStrategy,
};

export const updateIndicators: (
  piece: Bot | Bot[],
  maxIndicators?: number
) => Bot[] = (piece, maxIndicators = 4) => {
  piece = Array.isArray(piece) ? piece : [piece];

  const dimension = os.getCurrentDimension();
  const filteredPieces = piece.filter((currElement) => {
    return currElement.tags[dimension] === true;
  });
  const indicators: Bot[] = [];

  const userPresence = userPresenceService.getUserPresence();

  for (const currPiece of filteredPieces) {
    const strategy = updateStrategiesMap[currPiece.tags.poolTag];

    if (!strategy) {
      console.error(
        `Strategy not found for ${currPiece.tags.poolTag} at activityIndicatorsController.updateIndicators`
      );
      continue;
    }

    const currIndicators =
      PieceActivityService.getActivityIndicatorsForPiece(currPiece);
    const strategyResult = strategy(currPiece);
    const {
      indicatorScales,
      extraContentScales,
      extraBackgroundScales,
      form,
      pieceData,
    } = strategyResult;
    let { selectionsPiece } = strategyResult;

    if (
      !selectionsPiece ||
      (Array.isArray(selectionsPiece) && selectionsPiece.length === 0)
    ) {
      console.error(
        `Not selectionsPiecefound at activityIndicatorsController.updateIndicators`
      );
      continue;
    }

    if (Array.isArray(selectionsPiece)) {
      console.warn(
        `selectionsPiece is an array. Taking the first element in the list`
      );
      selectionsPiece = selectionsPiece[0] as Bot;
    }

    const pieceActivity = PieceActivityService.getPieceActivity({
      piece: selectionsPiece,
    });

    if (pieceActivity.length === 0) {
      currIndicators.forEach((indicator) => {
        ObjectPooler.ReleaseObject({
          obj: indicator,
          tag: indicator.tags.poolTag,
        });
      });
      continue;
    }

    const limit = Math.min(pieceActivity.length, maxIndicators);
    for (const currIndicator of currIndicators) {
      if (currIndicator.tags.activityIndex >= limit) {
        ObjectPooler.ReleaseObject({
          obj: currIndicator,
          tag: currIndicator.tags.poolTag,
        });
      }
    }

    if (pieceActivity.length <= maxIndicators) {
      const { extraIndicatorContent, extraIndicatorBackground } =
        PieceActivityService.getExtraActivityIndicatorsForPiece(currPiece);
      if (extraIndicatorContent)
        ObjectPooler.ReleaseObject({
          obj: extraIndicatorContent,
          tag: extraIndicatorContent.tags.poolTag,
        });
      if (extraIndicatorBackground)
        ObjectPooler.ReleaseObject({
          obj: extraIndicatorBackground,
          tag: extraIndicatorBackground.tags.poolTag,
        });
    }

    for (
      let activityIndex = 0;
      activityIndex < pieceActivity.length;
      activityIndex++
    ) {
      const activity = pieceActivity[activityIndex] as Tab;
      if (activityIndex >= maxIndicators) {
        const extraCount = pieceActivity.length - maxIndicators;
        const label = `+${extraCount}`;
        let { extraIndicatorContent, extraIndicatorBackground } =
          PieceActivityService.getExtraActivityIndicatorsForPiece(currPiece);
        if (!extraIndicatorContent) {
          extraIndicatorContent = ObjectPooler.GetObjectFromPool({
            tag: ObjectPoolTags.ActivityIndicator,
          });
        }
        if (!extraIndicatorBackground) {
          extraIndicatorBackground = ObjectPooler.GetObjectFromPool({
            tag: ObjectPoolTags.ActivityIndicator,
          });
        }

        if (!extraIndicatorContent || !extraIndicatorBackground) {
          console.error(
            `extraIndicatorContent and/or extraIndicatorBackground not found at activityIndicatorsController.updateIndicators`
          );
          continue;
        }

        const backgroundMod = {
          color: "black",
          [dimension]: true,
          isExtraBackground: true,
          transformer:
            currPiece.tags.poolTag === ObjectPoolTags.InfoLabelTransformer &&
            getID(currPiece),
          ownerBotId:
            currPiece.tags.poolTag === ObjectPoolTags.InfoLabelTransformer &&
            getID(currPiece.links.ownerBot as Bot),
          ownerDataId:
            currPiece.tags.poolTag !== ObjectPoolTags.InfoLabelTransformer &&
            pieceData &&
            pieceData.id,
          activityIndex,
          scaleX: extraBackgroundScales.x,
          scaleY: extraBackgroundScales.y,
          scaleZ: extraBackgroundScales.z,
          targetOpacity: 1,
          formOpacity: 1,
          form,
        };
        const contentMod = {
          color: "white",
          [dimension]: true,
          isExtraContent: true,
          transformer:
            currPiece.tags.poolTag == ObjectPoolTags.InfoLabelTransformer &&
            getID(currPiece),
          ownerBotId:
            currPiece.tags.poolTag == ObjectPoolTags.InfoLabelTransformer &&
            getID(currPiece.links.ownerBot as Bot),
          ownerDataId:
            currPiece.tags.poolTag !== ObjectPoolTags.InfoLabelTransformer &&
            pieceData &&
            pieceData.id,
          activityIndex,
          label,
          scaleX: extraContentScales.x,
          scaleY: extraContentScales.y,
          scaleZ: extraContentScales.z,
          targetOpacity: 1,
          formOpacity: 1,
          form: form,
        };
        extraIndicatorBackground.OnSpawned({ mod: backgroundMod });
        extraIndicatorContent.OnSpawned({ mod: contentMod });
        indicators.push(extraIndicatorBackground, extraIndicatorContent);
        break;
      } else {
        const isActiveTab =
          activity.id ===
          (globalThis as unknown as { ActiveTab: Tab | undefined }).ActiveTab
            ?.id;

        const matchingPresence = Array.from(userPresence).find(
          ([, presenceData]) => {
            return activity.id === presenceData.tabId;
          }
        );
        const color = userColorStore.getUserColor({
          configId: matchingPresence?.[0] ?? configBot.id,
        });

        const opacity = isActiveTab ? 1 : 0.5;
        const formRenderOrder = isActiveTab ? -1 : 10 - Number(activityIndex);

        let indicator = PieceActivityService.getPieceIndicatorByActivityIndex(
          currPiece,
          activityIndex
        );

        if (indicator) {
          setTag(indicator, "color", color);
          setTagMask(indicator, "formOpacity", opacity);
          setTag(indicator, "targetOpacity", opacity);
          setTag(indicator, "formRenderOrder", formRenderOrder);
        } else {
          indicator = ObjectPooler.GetObjectFromPool({
            tag: ObjectPoolTags.ActivityIndicator,
          });
          if (indicator) {
            const indicatorMod = {
              color,
              activityIndex,
              [dimension]: true,
              transformer:
                currPiece.tags.poolTag ===
                  ObjectPoolTags.InfoLabelTransformer && getID(currPiece),
              ownerBotId:
                currPiece.tags.poolTag ===
                  ObjectPoolTags.InfoLabelTransformer &&
                getID(currPiece.links.ownerBot),
              ownerDataId:
                currPiece.tags.poolTag !==
                  ObjectPoolTags.InfoLabelTransformer &&
                pieceData &&
                pieceData.id,
              scaleX: indicatorScales.x,
              scaleY: indicatorScales.y,
              scaleZ: indicatorScales.z,
              form: form,
              formOpacity: opacity,
              targetOpacity: opacity,
              formRenderOrder,
            };
            indicator.OnSpawned({ mod: indicatorMod });
          }
        }
        if (indicator) indicators.push(indicator);
      }
    }

    updateIndicatorsPosition(currPiece);
  }

  return indicators;
};
