import { GetBotScales } from "bibleVizUtils.infrastructure.functions.casualos";
import type {
  Point3D,
  Vector3 as Vector3Type,
} from "../../../../../../typings/AuxLibraryDefinitions";
import type {
  ActivityContainer,
  ActivityIndicatorsAdapterPort,
} from "bibleVizUtils.domain.ports.pieceActivity";
import {
  BiblePiece,
  type ActivityIndicator,
  type Piece,
} from "bibleVizUtils.domain.models.canvas";
import { InfoLabelData } from "bibleVizUtils.domain.entities.InfoLabelData";
import type {
  ActivityIndicatorBot,
  BibleVizUtilsObjectPoolerMap,
  ExtraBackgroundActivityIndicatorTags,
  ExtraContentActivityIndicatorTags,
  PieceBot,
  RegularActivityIndicatorTags,
} from "bibleVizUtils.infrastructure.models.casualos";
import { ActivityIndicatorMapper } from "bibleVizUtils.infrastructure.mappers.ActivityIndicatorMapper"; // TODO: Inyect as port
import { InfoLabelTextMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTextMapper"; // TODO: Inyect as port
import type { IndicatorsRepositoryPort } from "bibleVizUtils.domain.ports.pieceActivity";
import type { ObjectPooler } from "bibleVizUtils.infrastructure.adapters.casualos.ObjectPooler";
import type { ActivityIndicatorVisualConfigsType } from "bibleVizUtils.infrastructure.config.activityIndicators.visuals";

interface PositionStrategyParams {
  ownerBot: PieceBot;
  indicatorBot: ActivityIndicatorBot;
  dimension: string;
  container: ActivityContainer;
  configProviderPort: AdapterParams["configProviderPort"];
}

type PositionStrategyType = (params: PositionStrategyParams) => Vector3Type;

const labelPositionStrategy: PositionStrategyType = ({
  indicatorBot,
  container,
  configProviderPort,
}) => {
  const offset = configProviderPort.getVisualConfig("LabelOffset");
  const step = configProviderPort.getVisualConfig("LabelStep");
  if (!(container instanceof InfoLabelData)) {
    throw new Error(
      `ActivityIndicatorsAdapter: container must be an instance of InfoLabelData at labelPositionStrategy`
    );
  }
  const labelTextBot = InfoLabelTextMapper.toInfrastructure(container.label);
  if (!labelTextBot) {
    throw new Error(
      `ActivityIndicatorsAdapter: labelTextBot not found at labelPositionStrategy`
    );
  }
  const piecePosition = labelTextBot.tags.initialPosition;
  if (!piecePosition) {
    throw new Error(
      `ActivityIndicatorsAdapter: piecePosition not defined at labelPositionStrategy`
    );
  }
  if (indicatorBot.tags.index === undefined) {
    throw new Error(
      `ActivityIndicatorsAdapter: indicatorBot.tags.index not defined at labelPositionStrategy`
    );
  }
  const pieceScales = GetBotScales(labelTextBot);
  const position = new Vector3(
    piecePosition.x -
      pieceScales.x / 2 +
      configProviderPort.getVisualConfig("LabelScales").x / 2 +
      offset.x +
      indicatorBot.tags.index * step.x,
    piecePosition.y + pieceScales.y / 2,
    piecePosition.z +
      pieceScales.z +
      offset.z +
      indicatorBot.tags.index *
        (step.z *
          (indicatorBot.tags.indicatorType === "extraContent" ? 2 : 1)) +
      (indicatorBot.tags.indicatorType === "extraContent" ? step.z : 0)
  );
  return position;
};

const createPositionGroundedStrategy = (type: "chapter" | "book") => {
  const strategy: PositionStrategyType = ({
    ownerBot,
    indicatorBot,
    dimension,
    configProviderPort,
  }) => {
    const ownerPosition = getBotPosition(ownerBot, dimension);
    const ownerScales = GetBotScales(ownerBot);

    if (indicatorBot.tags.index === undefined) {
      throw new Error(
        `ActivityIndicatorsAdapter: indicatorBot.tags.index not defined at createPositionGroundedStrategy`
      );
    }

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
        indicatorBot.tags.index * step.x,
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
  [BiblePiece.InfoLabelTransformer]: labelPositionStrategy,
  [BiblePiece.StackChapter]: createPositionGroundedStrategy("chapter"),
  [BiblePiece.LayoutChapter]: createPositionGroundedStrategy("chapter"),
  [BiblePiece.LayoutBook]: createPositionGroundedStrategy("book"),
};

type UpdateStrategyType = (
  configProviderPort: AdapterParams["configProviderPort"]
) => {
  indicatorScales:
    | ActivityIndicatorVisualConfigsType["LabelScales"]
    | ActivityIndicatorVisualConfigsType["GroundedScales"];
  extraContentScales:
    | ActivityIndicatorVisualConfigsType["LabelExtraUsersContentScales"]
    | ActivityIndicatorVisualConfigsType["GroundedExtraUsersContentScales"];
  extraBackgroundScales:
    | ActivityIndicatorVisualConfigsType["LabelExtraUsersBackgroundScales"]
    | ActivityIndicatorVisualConfigsType["GroundedExtraUsersBackgroundScales"];
  form:
    | ActivityIndicatorVisualConfigsType["LabelForm"]
    | ActivityIndicatorVisualConfigsType["GroundedForm"];
};

const updateLabelStrategy: UpdateStrategyType = (configProviderPort) => {
  const indicatorScales = configProviderPort.getVisualConfig("LabelScales");
  const extraContentScales = configProviderPort.getVisualConfig(
    "LabelExtraUsersContentScales"
  );
  const extraBackgroundScales = configProviderPort.getVisualConfig(
    "LabelExtraUsersBackgroundScales"
  );
  const form = configProviderPort.getVisualConfig("LabelForm");

  return {
    indicatorScales,
    extraContentScales,
    extraBackgroundScales,
    form,
  };
};

const updatePieceStrategy: UpdateStrategyType = (configProviderPort) => {
  const indicatorScales = configProviderPort.getVisualConfig("GroundedScales");
  const extraContentScales = configProviderPort.getVisualConfig(
    "GroundedExtraUsersContentScales"
  );
  const extraBackgroundScales = configProviderPort.getVisualConfig(
    "GroundedExtraUsersBackgroundScales"
  );
  const form = configProviderPort.getVisualConfig("GroundedForm");

  return {
    indicatorScales,
    extraContentScales,
    extraBackgroundScales,
    form,
  };
};

const updateStrategiesMap: Record<string, UpdateStrategyType> = {
  [BiblePiece.InfoLabelTransformer]: updateLabelStrategy,
  [BiblePiece.StackChapter]: updatePieceStrategy,
  [BiblePiece.LayoutBook]: updatePieceStrategy,
  [BiblePiece.LayoutChapter]: updatePieceStrategy,
};

interface ActivityIndicatorsConfigProviderPort {
  getVisualConfig: <K extends keyof ActivityIndicatorVisualConfigsType>(
    key: K
  ) => ActivityIndicatorVisualConfigsType[K];
}

interface ActivityIndicatorBotsRepositoryPort {
  getIndicatorBotsByPieceId: (
    pieceId: ActivityIndicatorBot["tags"]["ownerBotId"]
  ) => ActivityIndicatorBot[];
  getIndicatorBotsByPieceDataId: (
    pieceDataId: ActivityIndicatorBot["tags"]["ownerDataId"]
  ) => ActivityIndicatorBot[];
}

interface AdapterParams {
  objectPooler: ObjectPooler<BibleVizUtilsObjectPoolerMap>;
  configProviderPort: ActivityIndicatorsConfigProviderPort;
  botsRepositoryPort: ActivityIndicatorBotsRepositoryPort;
}

export class ActivityIndicatorsAdapter
  implements ActivityIndicatorsAdapterPort, IndicatorsRepositoryPort
{
  #objectPooler: AdapterParams["objectPooler"];
  #configProviderPort: AdapterParams["configProviderPort"];
  #botsRepositoryPort: AdapterParams["botsRepositoryPort"];
  constructor({
    objectPooler,
    configProviderPort,
    botsRepositoryPort,
  }: AdapterParams) {
    this.#objectPooler = objectPooler;
    this.#configProviderPort = configProviderPort;
    this.#botsRepositoryPort = botsRepositoryPort;
  }
  showIndicators: ActivityIndicatorsAdapterPort["showIndicators"] = ({
    container,
    command,
  }) => {
    const commands = Array.isArray(command) ? command : [command];

    const indicatorBotList: ActivityIndicatorBot[] = [];
    const dimension = os.getCurrentDimension(); // TODO: Obtain dimension from a dimension provider port
    let piece: Piece | undefined = undefined;
    if (container instanceof InfoLabelData) {
      piece = container.owner;
    } else {
      piece = container.piece;
    }

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

    const { indicatorScales, extraContentScales, extraBackgroundScales, form } =
      strategy(this.#configProviderPort);

    for (const currCommand of commands) {
      const { index, indicator } = currCommand;
      let indicatorBot: ActivityIndicatorBot | undefined;
      let mod:
        | Partial<ExtraContentActivityIndicatorTags>
        | Partial<ExtraBackgroundActivityIndicatorTags>
        | Partial<RegularActivityIndicatorTags>
        | undefined;

      if (indicator) {
        indicatorBot = ActivityIndicatorMapper.toInfrastructure(indicator);
      } else {
        indicatorBot = this.#objectPooler.getObject(
          BiblePiece.ActivityIndicator
        );
      }

      if (!indicatorBot) {
        throw new Error(
          `ActivityIndicatorsAdapter: indicator not found at showIndicators`
        );
      }

      const baseMod = {
        transformer:
          piece.type === "InfoLabelTransformer" ? piece.id : undefined,
        ownerBotId: piece.id,
        ownerDataId: container.id,
        form,
        index,
        isActivityIndicator: true,
        system: undefined,
      };

      switch (currCommand.type) {
        case "regular":
          {
            const { isOwnUserActiveActivity, color } = currCommand;
            const opacity = isOwnUserActiveActivity ? 1 : 0.5;
            const formRenderOrder = isOwnUserActiveActivity
              ? -1
              : 10 - Number(index);

            mod = {
              color: color ?? "#ffffff",
              [dimension]: true,
              indicatorType: "regular",
              scaleX: indicatorScales.x,
              scaleY: indicatorScales.y,
              scaleZ: indicatorScales.z,
              formOpacity: opacity,
              targetOpacity: opacity,
              formRenderOrder,
              type: "ActivityIndicator",
              ...baseMod,
            };
          }
          break;
        case "extraContent":
          {
            const { extraUsers } = currCommand;
            const label = `+${extraUsers}`;

            mod = {
              color: "#ffffff",
              [dimension]: true,
              indicatorType: "extraContent",
              label,
              scaleX: extraContentScales.x,
              scaleY: extraContentScales.y,
              scaleZ: extraContentScales.z,
              targetOpacity: 1,
              formOpacity: 1,
              type: "ActivityIndicator",
              ...baseMod,
            };
          }
          break;
        case "extraBackground":
          {
            mod = {
              color: "#000000",
              [dimension]: true,
              indicatorType: "extraBackground",
              scaleX: extraBackgroundScales.x,
              scaleY: extraBackgroundScales.y,
              scaleZ: extraBackgroundScales.z,
              targetOpacity: 1,
              formOpacity: 1,
              type: "ActivityIndicator",
              ...baseMod,
            };
          }
          break;
      }

      applyMod(indicatorBot, mod);
      indicatorBotList.push(indicatorBot);
    }
    return indicatorBotList.map((indicatorBot) =>
      ActivityIndicatorMapper.toDomain(indicatorBot)
    );
  };
  hideIndicators: ActivityIndicatorsAdapterPort["hideIndicators"] = (
    indicators
  ) => {
    for (const indicator of indicators) {
      this.hideIndicator(indicator);
    }
  };
  hideIndicator: ActivityIndicatorsAdapterPort["hideIndicator"] = (
    indicator
  ) => {
    const indicatorBot = ActivityIndicatorMapper.toInfrastructure(indicator);
    if (indicatorBot) {
      this.#objectPooler.releaseObject(indicatorBot, "ActivityIndicator");
    }
  };
  updateIndicatorsPosition: ActivityIndicatorsAdapterPort["updateIndicatorsPosition"] =
    (container) => {
      const indicators = container.activityIndicators;
      for (const indicator of indicators) {
        this.updateIndicatorPosition(indicator, container);
      }
    };
  updateIndicatorPosition(
    indicator: ActivityIndicator,
    container: ActivityContainer
  ): void {
    const indicatorBot = ActivityIndicatorMapper.toInfrastructure(indicator);
    if (indicatorBot) {
      if (indicatorBot.tags.ownerBotId === undefined) {
        throw new Error(
          `ActivityIndicatorsAdapter: indicatorBot.tags.ownerBotId is not defined at updateIndicatorPosition`
        );
      }
      const ownerBot = getBot(byID(indicatorBot.tags.ownerBotId)) as
        | PieceBot
        | undefined;
      if (!ownerBot) {
        throw new Error(
          "ActivityIndicatorsAdapter: ownerBot not found at updateIndicatorPosition"
        );
      }
      const strategy = positionStrategiesMap[ownerBot.tags.type];

      if (!strategy)
        throw new Error(
          `ActivityIndicatorsAdapter: Strategy not found for ${ownerBot.tags.type} at updateIndicatorPosition`
        );

      const dimension = os.getCurrentDimension(); // TODO: Obtain dimension from a dimension provider port

      const position = strategy({
        ownerBot,
        indicatorBot,
        dimension,
        container,
        configProviderPort: this.#configProviderPort,
      });
      setTag(indicatorBot, dimension + "X", position.x);
      setTag(indicatorBot, dimension + "Y", position.y);
      setTag(indicatorBot, dimension + "Z", position.z);
      setTag(indicatorBot, "initialPosition", position);
    }
  }
  getIndicatorsByPieceId(
    pieceId: ActivityIndicatorBot["tags"]["ownerBotId"]
  ): ActivityIndicator[] {
    const bots = this.#botsRepositoryPort.getIndicatorBotsByPieceId(pieceId);
    const indicators = bots.map((bot) => ActivityIndicatorMapper.toDomain(bot));
    return indicators;
  }
  getIndicatorsByPieceDataId(
    pieceDataId: ActivityIndicatorBot["tags"]["ownerDataId"]
  ): ActivityIndicator[] {
    const bots =
      this.#botsRepositoryPort.getIndicatorBotsByPieceDataId(pieceDataId);
    const indicators = bots.map((bot) => ActivityIndicatorMapper.toDomain(bot));
    return indicators;
  }
}
