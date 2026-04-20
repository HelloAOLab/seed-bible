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
import type {
  ActivityIndicatorBot,
  InfoLabelDateBot,
  InfoLabelTailBot,
  InfoLabelTextBot,
  InfoLabelTransformerBot,
  PieceBot,
} from "../../models/casualos";
import type { ShowAnimationPacing } from "bibleVizUtils.infrastructure.models.label";
import { InfoLabelTransformerMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTransformerMapper";
import type {
  ShowAnimationDurationMapType,
  ShowAnimationConfigType,
} from "bibleVizUtils.infrastructure.config.labels.showAnimation";

interface LabelConfigProviderPort {
  getShowAnimationDuration: <P extends ShowAnimationPacing>(
    pacing: P
  ) => ShowAnimationDurationMapType[P];
  getShowAnimationConfig: <K extends keyof ShowAnimationConfigType>(
    key: K
  ) => ShowAnimationConfigType[K];
}

type DimensionProvider = () => string;

interface AdapterProps {
  dimensionProvider: DimensionProvider;
  labelConfigProviderPort: LabelConfigProviderPort;
}

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

export class LabelFeedbackAdapter {
  #shakeAnimationsMap: Map<InfoLabelData["id"], NodeJS.Timeout> = new Map();
  #dimensionProvider: AdapterProps["dimensionProvider"];
  #labelConfigProviderPort: AdapterProps["labelConfigProviderPort"];

  constructor({ dimensionProvider, labelConfigProviderPort }: AdapterProps) {
    this.#dimensionProvider = dimensionProvider;
    this.#labelConfigProviderPort = labelConfigProviderPort;
  }

  displayAttentionFeedback(data: InfoLabelData) {
    if (this.#shakeAnimationsMap.has(data.id)) {
      this.stopAttentionFeedback(data);
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
          `LabelFeedbackAdapter: initialPosition not defined at shakeLabel`
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

  stopAttentionFeedback(data: InfoLabelData) {
    const animationId = this.#shakeAnimationsMap.get(data.id);

    if (animationId) {
      clearInterval(animationId);
      this.#shakeAnimationsMap.delete(data.id);
    }
  }

  async displayShowFeedback({
    data,
    pacing,
  }: {
    data: InfoLabelData;
    pacing: ShowAnimationPacing;
  }) {
    const duration =
      this.#labelConfigProviderPort.getShowAnimationDuration(pacing);
    this.#stopOpacityTransition(data);

    const { transformer, text, tail, activityIndicators, date } =
      this.#unpackLabelData(data);

    try {
      await Promise.all([
        animateTag([tail, text, date ?? ""], "formOpacity", {
          toValue: thisBot.tags.targetOpacity,
          duration,
          easing:
            this.#labelConfigProviderPort.getShowAnimationConfig("easing"),
        }),
        ...(activityIndicators?.map((indicator) => {
          return animateTag(indicator, "formOpacity", {
            toValue: indicator.tags.targetOpacity,
            duration,
            easing:
              this.#labelConfigProviderPort.getShowAnimationConfig("easing"),
          });
        }) ?? []),
        animateTag(activityIndicators, {
          fromValue: { labelOpacity: 0 },
          toValue: { labelOpacity: transformer.tags.targetOpacity },
          duration,
          easing:
            this.#labelConfigProviderPort.getShowAnimationConfig("easing"),
        }),
        animateTag([text, date ?? ""], "labelOpacity", {
          toValue: transformer.tags.targetOpacity,
          duration,
          easing:
            this.#labelConfigProviderPort.getShowAnimationConfig("easing"),
        }),
      ]).then(() => {
        setTagMask(
          [text, tail],
          "pointable",
          transformer.tags.pointableDefault
        );
      });
    } catch (error) {
      console.error(error);
    }
  }

  async displayHideFeedback({
    data,
    pacing,
  }: {
    data: InfoLabelData;
    pacing: ShowAnimationPacing;
  }) {
    const duration =
      this.#labelConfigProviderPort.getShowAnimationDuration(pacing);
    this.#stopOpacityTransition(data);
    const { text, tail, activityIndicators, date } =
      this.#unpackLabelData(data);

    try {
      await Promise.all([
        animateTag(
          [...activityIndicators, tail, text, date ?? ""],
          "formOpacity",
          {
            toValue: 0,
            duration,
            easing:
              this.#labelConfigProviderPort.getShowAnimationConfig("easing"),
          }
        ),
        animateTag(activityIndicators, "labelOpacity", {
          toValue: 0,
          duration,
          easing:
            this.#labelConfigProviderPort.getShowAnimationConfig("easing"),
        }),
        animateTag([text, date ?? ""], "labelOpacity", {
          toValue: 0,
          duration,
          easing:
            this.#labelConfigProviderPort.getShowAnimationConfig("easing"),
        }),
      ]);
    } catch (error) {
      console.error(error);
    }
  }

  #unpackLabelData(data: InfoLabelData): {
    transformer: InfoLabelTransformerBot;
    text: InfoLabelTextBot;
    tail: InfoLabelTailBot;
    activityIndicators: ActivityIndicatorBot[];
    date: InfoLabelDateBot | undefined;
  } {
    const transformer = InfoLabelTransformerMapper.toInfrastructure(
      data.transformer
    );
    if (!transformer) {
      throw new Error(
        `LabelFeedbackAdapter: transformer not found at displayShowFeedback`
      );
    }
    const text = InfoLabelTextMapper.toInfrastructure(data.label);
    if (!text) {
      throw new Error(
        `LabelFeedbackAdapter: text not found at displayShowFeedback`
      );
    }
    const tail = InfoLabelTailMapper.toInfrastructure(data.tail);
    if (!tail) {
      throw new Error(
        `LabelFeedbackAdapter: tail not found at displayShowFeedback`
      );
    }
    const activityIndicators = data.activityIndicators.map((indicator) => {
      const indicatorBot = ActivityIndicatorMapper.toInfrastructure(indicator);
      if (!indicatorBot) {
        throw new Error(
          `LabelFeedbackAdapter: indicatorBot not found at displayShowFeedback`
        );
      }
      return indicatorBot;
    });
    let date: InfoLabelDateBot | undefined = undefined;
    if (data.date) {
      date = InfoLabelDateMapper.toInfrastructure(data.date);
    }

    return {
      transformer,
      text,
      tail,
      activityIndicators,
      date,
    };
  }

  #stopOpacityTransition(data: InfoLabelData) {
    const bots: PieceBot[] = [];
    const text = InfoLabelTextMapper.toInfrastructure(data.label);
    if (text) {
      bots.push(text);
    }
    const tail = InfoLabelTailMapper.toInfrastructure(data.tail);
    if (tail) {
      bots.push(tail);
    }
    const activityIndicators = data.activityIndicators.map((indicator) =>
      ActivityIndicatorMapper.toInfrastructure(indicator)
    );
    for (const indicator of activityIndicators) {
      if (indicator) {
        bots.push(indicator);
      }
    }
    if (data.date) {
      const date = InfoLabelDateMapper.toInfrastructure(data.date);
      if (date) {
        bots.push(date);
      }
    }
    animateTag(bots, "formOpacity", null);
    animateTag(bots, "labelOpacity", null);
  }

  disposeAll() {
    for (const animationId of this.#shakeAnimationsMap.values()) {
      clearInterval(animationId);
    }
    this.#shakeAnimationsMap.clear();
  }
}
