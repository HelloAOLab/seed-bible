import { GetBotScales } from "../../functions/casualos";
import type {
  Point3D,
  Vector3 as Vector3Type,
} from "../../../../../pattern-typings/AuxLibraryDefinitions";
import type { ActivityContainer } from "../../../domain/models/activity";
import type {
  ActivityIndicatorsAdapterPort as PieceActivityIndicatorsAdapterPort,
  ShowIndicatorsCommand,
} from "../../../application/ports/out/PieceActivity";
import type { ActivityIndicatorsAdapterPort as LabelActivityIndicatorsAdapterPort } from "../../../application/ports/out/PieceLabel";
import {
  BiblePieces,
  type ActivityIndicator,
  type Piece,
} from "../../../domain/models/canvas";
import type { HexString } from "../../../domain/models/commonTypes";
import { GetTonalChipColors } from "../../../domain/functions/colors";
import { InfoLabelData } from "../../../domain/entities/InfoLabelData";
import { ActivityIndicatorData } from "../../../domain/entities/ActivityIndicatorData";
import type { PieceBot } from "../../models/casualos";
import type {
  ActivityIndicatorBot,
  BackgroundActivityIndicatorTags,
  ExtraContentActivityIndicatorTags,
  InfoLabelTextBot,
  RegularActivityIndicatorTags,
} from "../../models/stack";
import type { ObjectPooler } from "../environment/ObjectPooler";
import type { VisualStateRegistry } from "../stacks/VisualStateRegistry";
import type { ActivityIndicatorVisualConfig } from "../../config/activityIndicators/visuals";
import type { BibleStackObjectPoolerMap } from "../../models/objectPooler";

interface ActivityIndicatorMapperPort {
  toInfrastructure: (
    indicator: ActivityIndicator
  ) => ActivityIndicatorBot | undefined;
}

interface InfoLabelTextMapperPort {
  toInfrastructure: (
    piece: Piece<"InfoLabelText">
  ) => InfoLabelTextBot | undefined;
}

interface DimensionProviderPort {
  getDimension(): string;
}

interface PositionStrategyParams {
  ownerBot: PieceBot;
  indicatorBot: ActivityIndicatorBot;
  indicator: ActivityIndicatorData;
  dimension: string;
  container: ActivityContainer;
  configProviderPort: AdapterParams["configProviderPort"];
  labelTextMapperPort: InfoLabelTextMapperPort;
  visualStateRegistryPort: VisualStateRegistry;
}

type PositionStrategyType = (params: PositionStrategyParams) => Vector3Type;

const labelPositionStrategy: PositionStrategyType = ({
  indicator,
  container,
  configProviderPort,
  labelTextMapperPort,
  visualStateRegistryPort,
}) => {
  const offset = configProviderPort.getVisualConfig("LabelOffset");
  const step = configProviderPort.getVisualConfig("LabelStep");
  if (!(container instanceof InfoLabelData)) {
    throw new Error(
      `ActivityIndicatorsAdapter: container must be an instance of InfoLabelData at labelPositionStrategy`
    );
  }
  const labelTextBot = labelTextMapperPort.toInfrastructure(container.label);
  if (!labelTextBot) {
    throw new Error(
      `ActivityIndicatorsAdapter: labelTextBot not found at labelPositionStrategy`
    );
  }
  const piecePosition = visualStateRegistryPort.getStateProperty({
    piece: container.label,
    property: "initialPosition",
  });
  if (!piecePosition) {
    throw new Error(
      `ActivityIndicatorsAdapter: piecePosition not defined at labelPositionStrategy`
    );
  }
  const pieceScales = GetBotScales(labelTextBot);
  const position = new Vector3(
    piecePosition.x -
      pieceScales.x / 2 +
      configProviderPort.getVisualConfig("LabelScales").x / 2 +
      offset.x +
      indicator.index * step.x,
    piecePosition.y + pieceScales.y / 2,
    piecePosition.z +
      pieceScales.z +
      offset.z +
      indicator.index *
        (step.z * (indicator.indicatorType === "extraContent" ? 2 : 1)) +
      (indicator.indicatorType === "extraContent" ? step.z : 0)
  );
  return position;
};

const createPositionGroundedStrategy = (type: "chapter" | "book") => {
  const strategy: PositionStrategyType = ({
    ownerBot,
    indicatorBot,
    indicator,
    dimension,
    configProviderPort,
  }) => {
    const ownerPosition = getBotPosition(ownerBot, dimension);
    const ownerScales = GetBotScales(ownerBot);

    let offset: Point3D | undefined = undefined;
    let step: Point3D | undefined = undefined;

    switch (type) {
      case "book":
        {
          offset = configProviderPort.getVisualConfig("ScriptureMapBookOffset");
          step = configProviderPort.getVisualConfig("ScriptureMapBookStep");
        }
        break;
      case "chapter": {
        offset = configProviderPort.getVisualConfig("ChapterOffset");
        step = configProviderPort.getVisualConfig("ChapterStep");
      }
    }

    return new Vector3(
      ownerPosition.x -
        ownerScales.x / 2 +
        configProviderPort.getVisualConfig("GroundedScales").x / 2 +
        offset.x +
        indicator.index * step.x,
      ownerPosition.y +
        ownerScales.y / 2 -
        configProviderPort.getVisualConfig("GroundedScales").y / 2 -
        offset.y,
      ownerPosition.z + ownerScales.z - indicatorBot.tags.scaleZ / 2
    );
  };
  return strategy;
};

const positionStrategiesMap: Record<string, PositionStrategyType> = {
  [BiblePieces.InfoLabelTransformer]: labelPositionStrategy,
  [BiblePieces.StackChapter]: createPositionGroundedStrategy("chapter"),
};

type UpdateStrategyType = (
  configProviderPort: AdapterParams["configProviderPort"]
) => {
  indicatorScales:
    | ActivityIndicatorVisualConfig["LabelScales"]
    | ActivityIndicatorVisualConfig["GroundedScales"];
  extraContentScales:
    | ActivityIndicatorVisualConfig["LabelExtraUsersContentScales"]
    | ActivityIndicatorVisualConfig["GroundedExtraUsersContentScales"];
  form:
    | ActivityIndicatorVisualConfig["LabelForm"]
    | ActivityIndicatorVisualConfig["GroundedForm"];
};

const updateLabelStrategy: UpdateStrategyType = (configProviderPort) => {
  const indicatorScales = configProviderPort.getVisualConfig("LabelScales");
  const extraContentScales = configProviderPort.getVisualConfig(
    "LabelExtraUsersContentScales"
  );
  const form = configProviderPort.getVisualConfig("LabelForm");

  return {
    indicatorScales,
    extraContentScales,
    form,
  };
};

const updatePieceStrategy: UpdateStrategyType = (configProviderPort) => {
  const indicatorScales = configProviderPort.getVisualConfig("GroundedScales");
  const extraContentScales = configProviderPort.getVisualConfig(
    "GroundedExtraUsersContentScales"
  );
  const form = configProviderPort.getVisualConfig("GroundedForm");

  return {
    indicatorScales,
    extraContentScales,
    form,
  };
};

const updateStrategiesMap: Record<string, UpdateStrategyType> = {
  [BiblePieces.InfoLabelTransformer]: updateLabelStrategy,
  [BiblePieces.StackChapter]: updatePieceStrategy,
};

interface ActivityIndicatorsConfigProviderPort {
  getVisualConfig: <K extends keyof ActivityIndicatorVisualConfig>(
    key: K
  ) => ActivityIndicatorVisualConfig[K];
}

interface AdapterParams {
  objectPooler: ObjectPooler<BibleStackObjectPoolerMap>;
  configProviderPort: ActivityIndicatorsConfigProviderPort;
  activityIndicatorMapperPort: ActivityIndicatorMapperPort;
  labelTextMapperPort: InfoLabelTextMapperPort;
  dimensionProviderPort: DimensionProviderPort;
  visualStateRegistryPort: VisualStateRegistry;
}

// prettier-ignore
export class ActivityIndicatorsAdapter implements PieceActivityIndicatorsAdapterPort, LabelActivityIndicatorsAdapterPort {
  #objectPooler: AdapterParams["objectPooler"];
  #configProviderPort: AdapterParams["configProviderPort"];
  #activityIndicatorMapperPort: AdapterParams["activityIndicatorMapperPort"];
  #labelTextMapperPort: AdapterParams["labelTextMapperPort"];
  #dimensionProviderPort: AdapterParams["dimensionProviderPort"];
  #visualStateRegistryPort: AdapterParams["visualStateRegistryPort"];
  constructor({
    objectPooler,
    configProviderPort,
    activityIndicatorMapperPort,
    labelTextMapperPort,
    dimensionProviderPort,
    visualStateRegistryPort,
  }: AdapterParams) {
    this.#objectPooler = objectPooler;
    this.#configProviderPort = configProviderPort;
    this.#activityIndicatorMapperPort = activityIndicatorMapperPort;
    this.#labelTextMapperPort = labelTextMapperPort;
    this.#dimensionProviderPort = dimensionProviderPort;
    this.#visualStateRegistryPort = visualStateRegistryPort;
  }

  showIndicators: (command: ShowIndicatorsCommand) => void = ({
    container,
    command,
  }) => {
    const commands = Array.isArray(command) ? command : [command];

    const dimension = this.#dimensionProviderPort.getDimension();
    let piece: Piece | undefined = undefined;
    let borderColor: HexString = "#ffffff";
    let labelBackground: HexString = "#ffffff";
    let labelInk: HexString = "#000000";
    if (container instanceof InfoLabelData) {
      piece = container.transformer;
      const labelTextBot = this.#labelTextMapperPort.toInfrastructure(
        container.label
      );
      if (labelTextBot) {
        borderColor = labelTextBot.tags.color as HexString;
        labelBackground = labelTextBot.tags.color as HexString;
        labelInk = (labelTextBot.tags.labelColor ?? "#000000") as HexString;
      }
    } else {
      piece = container.piece;
    }

    const chipColors = GetTonalChipColors({ labelBackground, labelInk });

    if (!piece) {
      throw new Error(
        "ActivityIndicatorsAdapter: piece not found at showIndicators"
      );
    }

    const pieceType = piece.type;

    const strategy = updateStrategiesMap[pieceType];

    if (!strategy) {
      throw new Error(
        `ActivityIndicatorsAdapter: strategy not found for pieceType: ${pieceType}`
      );
    }

    const { indicatorScales, form } = strategy(
      this.#configProviderPort
    );

    for (const currCommand of commands) {
      const { indicator } = currCommand;
      let mod:
        | Partial<ExtraContentActivityIndicatorTags>
        | Partial<RegularActivityIndicatorTags>
        | undefined;

      const indicatorBot = this.#activityIndicatorMapperPort.toInfrastructure(
        indicator.piece
      );

      if (!indicatorBot) {
        throw new Error(
          `ActivityIndicatorsAdapter: indicatorBot not found at showIndicators`
        );
      }

      const baseMod = {
        transformer:
          piece.type === "InfoLabelTransformer" ? piece.id : undefined,
        form,
        isActivityIndicator: true,
        system: undefined,
        formRenderOrder: 0,
        scaleX: indicatorScales.x,
        scaleY: indicatorScales.y,
        scaleZ: indicatorScales.z,
      };

      let targetOpacity = 1;

      switch (currCommand.type) {
        case "regular":
          {
            const { isSelected, color, pictureUrl } = currCommand;
            const opacity = isSelected ? 1 : 0.5;
            targetOpacity = opacity;

            mod = {
              color: color && !pictureUrl ? color : "#ffffff",
              [dimension]: true,
              formOpacity: opacity,
              type: "ActivityIndicator",
              formAddress: pictureUrl ?? undefined,
              ...baseMod,
            };
          }
          break;
        case "extraContent":
          {
            const { extraUsers } = currCommand;
            const label = `+${extraUsers}`;

            mod = {
              color: chipColors.background,
              labelColor: chipColors.text,
              [dimension]: true,
              label,
              formOpacity: 1,
              type: "ActivityIndicator",
              ...baseMod,
            };
          }
          break;
      }

      applyMod(indicatorBot, mod);

      this.#visualStateRegistryPort.registerState({
        piece: indicator.piece,
        state: {
          initialPosition: new Vector3(0, 0, 0),
          targetOpacity,
        },
      });

      this.#applyBackground(
        indicator,
        form,
        dimension,
        baseMod,
        indicatorScales,
        borderColor
      );
    }
  };
  #applyBackground(
    indicator: ActivityIndicatorData,
    form: "sphere" | "circle",
    dimension: string,
    baseMod: Partial<BackgroundActivityIndicatorTags>,
    indicatorScale: { x: number; y: number; z: number },
    borderColor: HexString
  ): void {
    const background = indicator.background;
    if (!background) {
      return;
    }
    const backgroundBot =
      this.#activityIndicatorMapperPort.toInfrastructure(background);
    if (!backgroundBot) {
      return;
    }

    const factor = this.#configProviderPort.getVisualConfig("BorderScaleFactor");
    const depth =
      form === "sphere"
        ? this.#configProviderPort.getVisualConfig("GroundedBorderDepth")
        : this.#configProviderPort.getVisualConfig("LabelBorderDepth");

    const mod: Partial<BackgroundActivityIndicatorTags> = {
      color: borderColor,
      [dimension]: true,
      formOpacity: 1,
      type: "ActivityIndicator",
      ...baseMod,
      scaleX: indicatorScale.x * factor,
      scaleY: indicatorScale.y * factor,
      scaleZ: depth,
    };

    applyMod(backgroundBot, mod);

    this.#visualStateRegistryPort.registerState({
      piece: background,
      state: {
        initialPosition: new Vector3(0, 0, 0),
        targetOpacity: 1,
      },
    });
  }
  hideIndicators: (indicators: ActivityIndicatorData[]) => void = (
    indicators
  ) => {
    for (const indicator of indicators) {
      this.hideIndicator(indicator);
    }
  };
  hideIndicator: (indicator: ActivityIndicatorData) => void = (indicator) => {
    const indicatorBot = this.#activityIndicatorMapperPort.toInfrastructure(
      indicator.piece
    );
    if (indicatorBot) {
      this.#objectPooler.releaseObject(indicatorBot, "ActivityIndicator");
    }
    if (indicator.background) {
      const backgroundBot = this.#activityIndicatorMapperPort.toInfrastructure(
        indicator.background
      );
      if (backgroundBot) {
        this.#objectPooler.releaseObject(backgroundBot, "ActivityIndicator");
      }
    }
  };
  updateIndicatorsPosition: (container: ActivityContainer) => void = (
    container
  ) => {
    const indicators = container.activityIndicators;
    for (const indicator of indicators) {
      this.updateIndicatorPosition(indicator, container);
    }
  };
  updateIndicatorPosition(
    indicator: ActivityIndicatorData,
    container: ActivityContainer
  ): void {
    const indicatorBot = this.#activityIndicatorMapperPort.toInfrastructure(
      indicator.piece
    );
    if (!indicatorBot) {
      return;
    }
    const ownerBot = getBot(byID(indicator.containerPieceId)) as
      | PieceBot
      | undefined;
    if (!ownerBot) {
      throw new Error(
        "ActivityIndicatorsAdapter: ownerBot not found at updateIndicatorPosition"
      );
    }
    const strategy = positionStrategiesMap[indicator.containerType];

    if (!strategy)
      throw new Error(
        `ActivityIndicatorsAdapter: Strategy not found for ${indicator.containerType} at updateIndicatorPosition`
      );

    const dimension = this.#dimensionProviderPort.getDimension();

    const strategyParams = {
      ownerBot,
      indicator,
      dimension,
      container,
      configProviderPort: this.#configProviderPort,
      labelTextMapperPort: this.#labelTextMapperPort,
      visualStateRegistryPort: this.#visualStateRegistryPort,
    };

    const position = strategy({ ...strategyParams, indicatorBot });
    setTag(indicatorBot, dimension + "X", position.x);
    setTag(indicatorBot, dimension + "Y", position.y);
    setTag(indicatorBot, dimension + "Z", position.z);
    this.#visualStateRegistryPort.registerStateProperty({
      piece: indicator.piece,
      property: "initialPosition",
      value: position,
    });

    if (indicator.background) {
      const backgroundBot = this.#activityIndicatorMapperPort.toInfrastructure(
        indicator.background
      );
      if (backgroundBot) {
        const backgroundPosition = strategy({
          ...strategyParams,
          indicatorBot: backgroundBot,
        });
        const zBias =
          indicator.containerType === BiblePieces.InfoLabelTransformer
            ? this.#configProviderPort.getVisualConfig("LabelStep").z / 2
            : 0;
        const backgroundZ = backgroundPosition.z - zBias;
        setTag(backgroundBot, dimension + "X", backgroundPosition.x);
        setTag(backgroundBot, dimension + "Y", backgroundPosition.y);
        setTag(backgroundBot, dimension + "Z", backgroundZ);
        this.#visualStateRegistryPort.registerStateProperty({
          piece: indicator.background,
          property: "initialPosition",
          value: new Vector3(
            backgroundPosition.x,
            backgroundPosition.y,
            backgroundZ
          ),
        });
      }
    }
  }
}
