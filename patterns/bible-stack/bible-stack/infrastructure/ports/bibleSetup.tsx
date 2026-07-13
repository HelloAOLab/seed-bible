import type { StackPieceMeasurementsType } from "bibleVizUtils.infrastructure.config.stacks.measurements";
import type { StackSpacingsType } from "bibleVizUtils.infrastructure.config.stacks.spacings";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { PieceBot } from "bibleVizUtils.infrastructure.models.casualos";
import type { VisualStateMap } from "bibleStack.infrastructure.models.visualState";
import type { StackPieceLifecycleAdapterPort } from "bibleStack.application.ports.pieceLifecycle";
import type { StackTestamentMapper } from "../mappers/StackTestamentMapper";

export interface BibleSetupConfigProviderPort {
  getStackPieceMeasurement<K extends keyof StackPieceMeasurementsType>(
    key: K
  ): StackPieceMeasurementsType[K];
  getStackSpacing<K extends keyof StackSpacingsType>(
    key: K
  ): StackSpacingsType[K];
}

export interface VisualStateRegistryPort {
  registerState<K extends keyof VisualStateMap>(params: {
    piece: Piece<K>;
    state: VisualStateMap[K];
  }): void;
  registerStateProperty<
    K extends keyof VisualStateMap,
    P extends keyof VisualStateMap[K],
  >(params: {
    piece: Piece<K>;
    property: P;
    value: VisualStateMap[K][P];
  }): void;
  getStateProperty<
    K extends keyof VisualStateMap,
    P extends keyof VisualStateMap[K],
  >(params: {
    piece: Piece<K>;
    property: P;
  }): VisualStateMap[K][P];
}

export interface PieceMapperPort {
  toInfrastructure(piece: Piece): PieceBot | undefined;
}

export interface DimensionProviderPort {
  getCurrentDimension(): string;
}

export interface BibleSetupAdapterParams {
  dimensionProviderPort: DimensionProviderPort;
  configProviderPort: BibleSetupConfigProviderPort;
  visualStateRegistryPort: VisualStateRegistryPort;
  pieceMapperPort: PieceMapperPort;
  stackPieceLifecycleAdapterPort: Pick<
    StackPieceLifecycleAdapterPort,
    "spawnTestament"
  >;
  testamentMapperPort: StackTestamentMapper;
}
