import type { InfoLabelData } from "../../../domain/entities/InfoLabelData";
import type { ActivityIndicator, Piece } from "../../../domain/models/canvas";
import type {
  LabelPosition,
  LabelTranslucencyMode,
  ShowSequencePacing,
} from "../../../domain/models/label";
import type {
  Easing,
  Vector2 as TVector2,
  Vector3 as TVector3,
  Vector3,
} from "../../../../../pattern-typings/AuxLibraryDefinitions";
import type { InfoLabelTailMapper } from "../../mappers/InfoLabelTailMapper";
import type { InfoLabelDateMapper } from "../../mappers/InfoLabelDateMapper";
import type { PieceBot, PieceBotTags, TypedBot } from "../../models/casualos";
import type {
  ActivityIndicatorBot,
  InfoLabelDateBot,
  InfoLabelTailBot,
  InfoLabelTextBot,
  InfoLabelTransformerBot,
} from "../../models/stack";
import type { InfoLabelTransformerMapper } from "../../mappers/InfoLabelTransformerMapper";
import type {
  ShowAnimationDurationMapType,
  ShowAnimationConfigType,
} from "../../config/labels/showAnimation";
import { AnimateStrictTag, SetStrictTag } from "../../functions/casualos";
import type { VisualStateRegistry } from "../stacks/VisualStateRegistry";

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
  getShakeDirection: (position: LabelPosition) => TVector2;
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
  infoLabelTransformerMapperPort: InfoLabelTransformerMapper;
  infoLabelTailMapperPort: InfoLabelTailMapper;
  infoLabelDateMapperPort: InfoLabelDateMapper;
  visualStateRegistryPort: VisualStateRegistry;
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
  return AnimateStrictTag(pieceBot, {
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
    tagMaskSpace: false,
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
  return AnimateStrictTag(pieceBot, {
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
    tagMaskSpace: false,
  });
};

export class LabelFeedbackAdapter {
  #shakeAnimationsMap: Map<InfoLabelData["id"], number> = new Map();
  #dimensionProvider: AdapterProps["dimensionProvider"];
  #labelFeedbackConfigProviderPort: AdapterProps["labelFeedbackConfigProviderPort"];
  #infoLabelTextMapperPort: AdapterProps["infoLabelTextMapperPort"];
  #activityIndicatorMapperPort: AdapterProps["activityIndicatorMapperPort"];
  #infoLabelTransformerMapperPort: AdapterProps["infoLabelTransformerMapperPort"];
  #infoLabelTailMapperPort: AdapterProps["infoLabelTailMapperPort"];
  #infoLabelDateMapperPort: AdapterProps["infoLabelDateMapperPort"];
  #visualStateRegistryPort: AdapterProps["visualStateRegistryPort"];

  constructor({
    dimensionProvider,
    labelFeedbackConfigProviderPort,
    infoLabelTextMapperPort,
    activityIndicatorMapperPort,
    infoLabelTransformerMapperPort,
    infoLabelTailMapperPort,
    infoLabelDateMapperPort,
    visualStateRegistryPort,
  }: AdapterProps) {
    this.#dimensionProvider = dimensionProvider;
    this.#labelFeedbackConfigProviderPort = labelFeedbackConfigProviderPort;
    this.#infoLabelTextMapperPort = infoLabelTextMapperPort;
    this.#activityIndicatorMapperPort = activityIndicatorMapperPort;
    this.#infoLabelTransformerMapperPort = infoLabelTransformerMapperPort;
    this.#infoLabelTailMapperPort = infoLabelTailMapperPort;
    this.#infoLabelDateMapperPort = infoLabelDateMapperPort;
    this.#visualStateRegistryPort = visualStateRegistryPort;
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

    const piecesBotData: (
      | {
          pieceBot:
            | ActivityIndicatorBot
            | InfoLabelTransformerBot
            | InfoLabelTextBot
            | InfoLabelTailBot
            | InfoLabelDateBot
            | undefined;
          initialPosition: Vector3;
        }
      | undefined
    )[] = [
      {
        pieceBot: this.#infoLabelTextMapperPort.toInfrastructure(data.label),
        initialPosition: this.#visualStateRegistryPort.getStateProperty({
          piece: data.label,
          property: "initialPosition",
        }),
      },
      {
        pieceBot: this.#infoLabelTailMapperPort.toInfrastructure(data.tail),
        initialPosition: this.#visualStateRegistryPort.getStateProperty({
          piece: data.tail,
          property: "initialPosition",
        }),
      },
      data.date
        ? {
            pieceBot: this.#infoLabelDateMapperPort.toInfrastructure(data.date),
            initialPosition: this.#visualStateRegistryPort.getStateProperty({
              piece: data.date,
              property: "initialPosition",
            }),
          }
        : undefined,
      ...data.activityIndicators.map((indicator) => ({
        pieceBot: this.#activityIndicatorMapperPort.toInfrastructure(indicator),
        initialPosition: this.#visualStateRegistryPort.getStateProperty({
          piece: indicator,
          property: "initialPosition",
        }),
      })),
    ];

    const animations = piecesBotData.map(async (pieceBotData) => {
      if (!pieceBotData) {
        return;
      }

      const { pieceBot, initialPosition } = pieceBotData;

      if (!pieceBot) {
        return;
      }

      if (!initialPosition) {
        throw new Error(
          `LabelFeedbackAdapter: initialPosition not defined at shakeLabel`
        );
      }

      SetStrictTag(
        pieceBot,
        (dimension + "X") as keyof PieceBotTags,
        initialPosition.x
      );
      SetStrictTag(
        pieceBot,
        (dimension + "Y") as keyof PieceBotTags,
        initialPosition.y
      );
      SetStrictTag(
        pieceBot,
        (dimension + "Z") as keyof PieceBotTags,
        initialPosition.z
      );

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
    this.stopOpacityTransition(data);

    const { text, tail, activityIndicators, date } =
      this.#unpackLabelData(data);

    const labelTargetOpacity = this.#visualStateRegistryPort.getStateProperty({
      piece: data.transformer,
      property: "targetOpacity",
    });
    const isLabelInteractable = this.#visualStateRegistryPort.getStateProperty({
      piece: data.transformer,
      property: "isInteractable",
    });

    try {
      const botsToAnimateOpacity: TypedBot[] = [tail, text];
      const botsToAnimateLabelOpacity: TypedBot[] = [text];
      if (date) {
        botsToAnimateOpacity.push(date);
        botsToAnimateLabelOpacity.push(date);
      }

      await Promise.all([
        AnimateStrictTag(botsToAnimateOpacity, "formOpacity", {
          toValue: labelTargetOpacity,
          duration,
          easing:
            this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
              "easing"
            ),
          tagMaskSpace: false,
        }),
        ...(activityIndicators?.map((indicator) => {
          return AnimateStrictTag(indicator, "formOpacity", {
            toValue: this.#visualStateRegistryPort.getStateProperty({
              piece: { id: indicator.id, type: indicator.tags.type },
              property: "targetOpacity",
            }),
            duration,
            easing:
              this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
                "easing"
              ),
            tagMaskSpace: false,
          });
        }) ?? []),
        AnimateStrictTag(activityIndicators, {
          fromValue: { labelOpacity: 0 },
          toValue: { labelOpacity: labelTargetOpacity },
          duration,
          easing:
            this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
              "easing"
            ),
          tagMaskSpace: false,
        }),
        AnimateStrictTag(botsToAnimateLabelOpacity, "labelOpacity", {
          toValue: labelTargetOpacity,
          duration,
          easing:
            this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
              "easing"
            ),
          tagMaskSpace: false,
        }),
      ]).then(() => {
        SetStrictTag([text, tail], "pointable", isLabelInteractable);
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
    this.stopOpacityTransition(data);
    const { text, tail, activityIndicators, date } =
      this.#unpackLabelData(data);

    try {
      const botsToAnimateOpacity: TypedBot[] = [
        ...activityIndicators,
        tail,
        text,
      ];
      const botsToAnimateLabelOpacity: TypedBot[] = [text];
      if (date) {
        botsToAnimateOpacity.push(date);
        botsToAnimateLabelOpacity.push(date);
      }

      await Promise.all([
        AnimateStrictTag(botsToAnimateOpacity, "formOpacity", {
          toValue: 0,
          duration,
          easing:
            this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
              "easing"
            ),
          tagMaskSpace: false,
        }),
        AnimateStrictTag(activityIndicators, "labelOpacity", {
          toValue: 0,
          duration,
          easing:
            this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
              "easing"
            ),
          tagMaskSpace: false,
        }),
        AnimateStrictTag(botsToAnimateLabelOpacity, "labelOpacity", {
          toValue: 0,
          duration,
          easing:
            this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
              "easing"
            ),
          tagMaskSpace: false,
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
    this.stopOpacityTransition(data);
    const { text, tail, activityIndicators, date } =
      this.#unpackLabelData(data);

    try {
      const botsToAnimateOpacity: TypedBot[] = [
        ...activityIndicators,
        tail,
        text,
      ];
      const botsToAnimateLabelOpacity: TypedBot[] = [text];
      if (date) {
        botsToAnimateOpacity.push(date);
        botsToAnimateLabelOpacity.push(date);
      }
      await Promise.all([
        AnimateStrictTag(botsToAnimateOpacity, "formOpacity", {
          toValue: opacity,
          duration,
          easing:
            this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
              "easing"
            ),
          tagMaskSpace: false,
        }),
        AnimateStrictTag(activityIndicators, "labelOpacity", {
          toValue: opacity,
          duration,
          easing:
            this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
              "easing"
            ),
          tagMaskSpace: false,
        }),
        AnimateStrictTag(botsToAnimateLabelOpacity, "labelOpacity", {
          toValue: opacity,
          duration,
          easing:
            this.#labelFeedbackConfigProviderPort.getShowAnimationConfig(
              "easing"
            ),
          tagMaskSpace: false,
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
    const transformer = this.#infoLabelTransformerMapperPort.toInfrastructure(
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
    const tail = this.#infoLabelTailMapperPort.toInfrastructure(data.tail);
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
      date = this.#infoLabelDateMapperPort.toInfrastructure(data.date);
    }

    return {
      transformer,
      text,
      tail,
      activityIndicators,
      date,
    };
  }

  stopOpacityTransition(data: InfoLabelData) {
    const bots: PieceBot[] = [];
    const text = this.#infoLabelTextMapperPort.toInfrastructure(data.label);
    if (text) {
      bots.push(text);
    }
    const tail = this.#infoLabelTailMapperPort.toInfrastructure(data.tail);
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
      const date = this.#infoLabelDateMapperPort.toInfrastructure(data.date);
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
