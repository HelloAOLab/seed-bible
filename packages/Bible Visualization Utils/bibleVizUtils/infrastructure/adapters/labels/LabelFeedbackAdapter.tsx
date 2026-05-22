import type { InfoLabelData } from "bibleVizUtils.domain.entities.InfoLabelData";
import type {
  ActivityIndicator,
  Piece,
} from "bibleVizUtils.domain.models.canvas";
import type {
  LabelPositionType,
  LabelTranslucencyMode,
  ShowSequencePacing,
} from "bibleVizUtils.domain.models.label";
import type {
  Easing,
  Vector2 as TVector2,
  Vector3 as TVector3,
} from "../../../../../../typings/AuxLibraryDefinitions";
import { InfoLabelTailMapper } from "../../mappers/InfoLabelTailMapper";
import { InfoLabelDateMapper } from "../../mappers/InfoLabelDateMapper";
import type {
  ActivityIndicatorBot,
  InfoLabelDateBot,
  InfoLabelTailBot,
  InfoLabelTextBot,
  InfoLabelTransformerBot,
  PieceBot,
} from "../../models/casualos";
import { InfoLabelTransformerMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTransformerMapper";
import type {
  ShowAnimationDurationMapType,
  ShowAnimationConfigType,
} from "bibleVizUtils.infrastructure.config.labels.showAnimation";

interface LabelFeedbackConfigProviderPort {
  getShowAnimationDuration: <P extends ShowSequencePacing>(
    pacing: P
  ) => ShowAnimationDurationMapType[P];
  getShowAnimationConfig: <K extends keyof ShowAnimationConfigType>(
    key: K
  ) => ShowAnimationConfigType[K];
  getShakeAnimationDelay: () => number;
  getShakeDuration: () => number;
  getShakeEasing: () => Easing;
  getShakeDirection: (position: LabelPositionType) => TVector2;
  getIntensityOpacity: (mode: LabelTranslucencyMode) => number;
}

type DimensionProvider = () => string;

interface InfoLabelTextMapperPort {
  toInfrastructure: (
    piece: Piece<"InfoLabelText">
  ) => InfoLabelTextBot | undefined;
}

interface ActivityIndicatorMapperPort {
  toInfrastructure: (
    indicator: ActivityIndicator
  ) => ActivityIndicatorBot | undefined;
}

interface AdapterProps {
  dimensionProvider: DimensionProvider;
  labelFeedbackConfigProviderPort: LabelFeedbackConfigProviderPort;
  infoLabelTextMapperPort: InfoLabelTextMapperPort;
  activityIndicatorMapperPort: ActivityIndicatorMapperPort;
}

const shakeForwardConstructor = ({
  pieceBot,
  dimension,
  initialPosition,
  direction,
  duration,
  easing,
}: {
  pieceBot: PieceBot;
  dimension: string;
  initialPosition: TVector3;
  direction: TVector2;
  duration: number;
  easing: Easing;
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
    duration: duration / 4,
    easing,
  });
};

const shakeBackwardConstructor = ({
  pieceBot,
  dimension,
  initialPosition,
  direction,
  duration,
  easing,
}: {
  pieceBot: PieceBot;
  dimension: string;
  initialPosition: TVector3;
  direction: TVector2;
  duration: number;
  easing: Easing;
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
    duration: duration / 4,
    easing,
  });
};

export class LabelFeedbackAdapter {
  #shakeAnimationsMap: Map<InfoLabelData["id"], NodeJS.Timeout> = new Map();
  #dimensionProvider: AdapterProps["dimensionProvider"];
  #labelFeedbackConfigProviderPort: AdapterProps["labelFeedbackConfigProviderPort"];
  #infoLabelTextMapperPort: AdapterProps["infoLabelTextMapperPort"];
  #activityIndicatorMapperPort: AdapterProps["activityIndicatorMapperPort"];

  constructor({
    dimensionProvider,
    labelFeedbackConfigProviderPort,
    infoLabelTextMapperPort,
    activityIndicatorMapperPort,
  }: AdapterProps) {
    this.#dimensionProvider = dimensionProvider;
    this.#labelFeedbackConfigProviderPort = labelFeedbackConfigProviderPort;
    this.#infoLabelTextMapperPort = infoLabelTextMapperPort;
    this.#activityIndicatorMapperPort = activityIndicatorMapperPort;
  }

  displayAttentionFeedback(data: InfoLabelData) {
    if (this.#shakeAnimationsMap.has(data.id)) {
      this.stopAttentionFeedback(data);
    }

    const direction = this.#labelFeedbackConfigProviderPort.getShakeDirection(
      data.positioning
    );
    const delay =
      this.#labelFeedbackConfigProviderPort.getShakeAnimationDelay();

    const animationId = setInterval(() => {
      this.#shakeLabel(data, direction);
    }, delay);

    this.#shakeAnimationsMap.set(data.id, animationId);
  }

  #shakeLabel(data: InfoLabelData, direction: TVector2) {
    const dimension = this.#dimensionProvider();
    const duration = this.#labelFeedbackConfigProviderPort.getShakeDuration();
    const easing = this.#labelFeedbackConfigProviderPort.getShakeEasing();

    const piecesBot = [
      this.#infoLabelTextMapperPort.toInfrastructure(data.label),
      InfoLabelTailMapper.toInfrastructure(data.tail),
      data.date ? InfoLabelDateMapper.toInfrastructure(data.date) : undefined,
      ...data.activityIndicators.map((indicator) =>
        this.#activityIndicatorMapperPort.toInfrastructure(indicator)
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
        duration,
        easing,
      });
      await shakeBackwardConstructor({
        pieceBot,
        dimension,
        initialPosition,
        direction,
        duration,
        easing,
      });
      await shakeForwardConstructor({
        pieceBot,
        dimension,
        initialPosition,
        direction,
        duration,
        easing,
      });
      await shakeBackwardConstructor({
        pieceBot,
        dimension,
        initialPosition,
        direction,
        duration,
        easing,
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
    pacing: ShowSequencePacing;
  }) {
    const duration =
      this.#labelFeedbackConfigProviderPort.getShowAnimationDuration(pacing);
    this.#stopOpacityTransition(data);

    const { transformer, text, tail, activityIndicators, date } =
      this.#unpackLabelData(data);

    try {
      await Promise.all([
        animateTag([tail, text, date ?? ""], "formOpacity", {
          toValue: thisBot.tags.targetOpacity,
          duration,
          easing:
            this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
              "easing"
            ),
        }),
        ...(activityIndicators?.map((indicator) => {
          return animateTag(indicator, "formOpacity", {
            toValue: indicator.tags.targetOpacity,
            duration,
            easing:
              this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
                "easing"
              ),
          });
        }) ?? []),
        animateTag(activityIndicators, {
          fromValue: { labelOpacity: 0 },
          toValue: { labelOpacity: transformer.tags.targetOpacity },
          duration,
          easing:
            this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
              "easing"
            ),
        }),
        animateTag([text, date ?? ""], "labelOpacity", {
          toValue: transformer.tags.targetOpacity,
          duration,
          easing:
            this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
              "easing"
            ),
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
    pacing: ShowSequencePacing;
  }) {
    const duration =
      this.#labelFeedbackConfigProviderPort.getShowAnimationDuration(pacing);
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
              this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
                "easing"
              ),
          }
        ),
        animateTag(activityIndicators, "labelOpacity", {
          toValue: 0,
          duration,
          easing:
            this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
              "easing"
            ),
        }),
        animateTag([text, date ?? ""], "labelOpacity", {
          toValue: 0,
          duration,
          easing:
            this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
              "easing"
            ),
        }),
      ]);
    } catch (error) {
      console.error(error);
    }
  }

  async displayChangedIntensityFeedback({
    data,
    translucencyMode,
    pacing,
  }: {
    data: InfoLabelData;
    translucencyMode: LabelTranslucencyMode;
    pacing: ShowSequencePacing;
  }): Promise<void> {
    const duration =
      this.#labelFeedbackConfigProviderPort.getShowAnimationDuration(pacing);
    const opacity =
      this.#labelFeedbackConfigProviderPort.getIntensityOpacity(
        translucencyMode
      );
    this.#stopOpacityTransition(data);
    const { text, tail, activityIndicators, date } =
      this.#unpackLabelData(data);

    try {
      await Promise.all([
        animateTag(
          [...activityIndicators, tail, text, date ?? ""],
          "formOpacity",
          {
            toValue: opacity,
            duration,
            easing:
              this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
                "easing"
              ),
          }
        ),
        animateTag(activityIndicators, "labelOpacity", {
          toValue: opacity,
          duration,
          easing:
            this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
              "easing"
            ),
        }),
        animateTag([text, date ?? ""], "labelOpacity", {
          toValue: opacity,
          duration,
          easing:
            this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
              "easing"
            ),
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
    const text = this.#infoLabelTextMapperPort.toInfrastructure(data.label);
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
      const indicatorBot =
        this.#activityIndicatorMapperPort.toInfrastructure(indicator);
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
    const text = this.#infoLabelTextMapperPort.toInfrastructure(data.label);
    if (text) {
      bots.push(text);
    }
    const tail = InfoLabelTailMapper.toInfrastructure(data.tail);
    if (tail) {
      bots.push(tail);
    }
    const activityIndicators = data.activityIndicators.map((indicator) =>
      this.#activityIndicatorMapperPort.toInfrastructure(indicator)
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
    clearAnimations(bots, "formOpacity");
    clearAnimations(bots, "labelOpacity");
  }

  disposeAll() {
    for (const animationId of this.#shakeAnimationsMap.values()) {
      clearInterval(animationId);
    }
    this.#shakeAnimationsMap.clear();
  }
}
