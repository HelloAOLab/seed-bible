import type { InfoLabelData } from "bibleVizUtils.domain.entities.InfoLabelData";
import {
  LabelPosition,
  type LabelPositionType,
} from "bibleVizUtils.domain.models.label";
import type {
  Easing,
  Vector2 as TVector2,
  Vector3 as TVector3,
} from "../../../../../../typings/AuxLibraryDefinitions";
import { InfoLabelTextMapper } from "../../mappers/InfoLabelTextMapper";
import { InfoLabelTailMapper } from "../../mappers/InfoLabelTailMapper";
import { ActivityIndicatorMapper } from "../../mappers/ActivityIndicatorMapper";
import { InfoLabelDateMapper } from "../../mappers/InfoLabelDateMapper";
import type { PieceBot } from "../../models/casualos";

type DimensionProvider = () => string;

const directionStrategy: Record<LabelPositionType, TVector2> = {
  [LabelPosition.LeftSided]: new Vector2(0.1, 0),
  [LabelPosition.RightSided]: new Vector2(-0.1, 0),
  [LabelPosition.Top]: new Vector2(0, -0.1),
  [LabelPosition.RightSidedCorner]: new Vector2(-0.1, -0.1),
};
const shakeAnimationDelayTimeInMs = 5000;
const shakeDuration = 0.5;
const shakeEasing: Easing = { type: "sinusoidal", mode: "inout" };
const shakeForwardConstructor = ({
  pieceBot,
  dimension,
  initialPosition,
  direction,
}: {
  pieceBot: PieceBot;
  dimension: string;
  initialPosition: TVector3;
  direction: TVector2;
}) => {
  return animateTag(pieceBot, {
    fromValue: {
      [dimension + "X"]: initialPosition.x,
      [dimension + "Y"]: initialPosition.y,
    },
    toValue: {
      [dimension + "X"]: initialPosition.x + direction.x,
      [dimension + "Y"]: initialPosition.y + direction.y,
    },
    duration: shakeDuration / 4,
    easing: shakeEasing,
  });
};
const shakeBackwardConstructor = ({
  pieceBot,
  dimension,
  initialPosition,
  direction,
}: {
  pieceBot: PieceBot;
  dimension: string;
  initialPosition: TVector3;
  direction: TVector2;
}) => {
  return animateTag(pieceBot, {
    fromValue: {
      [dimension + "X"]: initialPosition.x + direction.x,
      [dimension + "Y"]: initialPosition.y + direction.y,
    },
    toValue: {
      [dimension + "X"]: initialPosition.x,
      [dimension + "Y"]: initialPosition.y,
    },
    duration: shakeDuration / 4,
    easing: shakeEasing,
  });
};

export class LabelAnimationAdapter {
  #shakeAnimationsMap: Map<InfoLabelData["id"], NodeJS.Timeout> = new Map();
  #dimensionProvider: DimensionProvider;

  constructor(dimensionProvider: DimensionProvider) {
    this.#dimensionProvider = dimensionProvider;
  }

  displayShakeAnimation(data: InfoLabelData) {
    if (this.#shakeAnimationsMap.has(data.id)) {
      this.stopShakeAnimation(data);
    }

    const direction = directionStrategy[data.positioning];

    const animationId = setInterval(() => {
      this.#shakeLabel(data, direction);
    }, shakeAnimationDelayTimeInMs);

    this.#shakeAnimationsMap.set(data.id, animationId);
  }

  #shakeLabel(data: InfoLabelData, direction: TVector2) {
    const dimension = this.#dimensionProvider();

    const piecesBot = [
      InfoLabelTextMapper.toInfrastructure(data.label),
      InfoLabelTailMapper.toInfrastructure(data.tail),
      data.date ? InfoLabelDateMapper.toInfrastructure(data.date) : undefined,
      ...data.activityIndicators.map((indicator) =>
        ActivityIndicatorMapper.toInfrastructure(indicator)
      ),
    ];

    const animations = piecesBot.map(async (pieceBot) => {
      if (!pieceBot) {
        return;
      }

      const initialPosition = pieceBot.tags.initialPosition;

      if (!initialPosition) {
        throw new Error(
          `LabelAnimationAdapter: initialPosition not defined at shakeLabel`
        );
      }

      setTagMask(pieceBot, dimension + "X", initialPosition.x);
      setTagMask(pieceBot, dimension + "Y", initialPosition.y);
      setTagMask(pieceBot, dimension + "Z", initialPosition.z);

      await shakeForwardConstructor({
        pieceBot,
        dimension,
        initialPosition,
        direction,
      });
      await shakeBackwardConstructor({
        pieceBot,
        dimension,
        initialPosition,
        direction,
      });
      await shakeForwardConstructor({
        pieceBot,
        dimension,
        initialPosition,
        direction,
      });
      await shakeBackwardConstructor({
        pieceBot,
        dimension,
        initialPosition,
        direction,
      });
    });

    Promise.all(animations).catch((error) => console.error(error));
  }

  stopShakeAnimation(data: InfoLabelData) {
    const animationId = this.#shakeAnimationsMap.get(data.id);

    if (animationId) {
      clearInterval(animationId);
      this.#shakeAnimationsMap.delete(data.id);
    }
  }

  disposeAll() {
    for (const animationId of this.#shakeAnimationsMap.values()) {
      clearInterval(animationId);
    }
    this.#shakeAnimationsMap.clear();
  }
}
