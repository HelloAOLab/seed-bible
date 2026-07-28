import type { StackTestamentMapper } from "../mappers/StackTestamentMapper";
import type { LayoutConfigProvider } from "../config/layout/LayoutConfigProvider";
import type { VisualStateRegistry } from "../adapters/stacks/VisualStateRegistry";
import type { PieceMapper } from "../mappers/PieceMapper";
import type { StackPieceLifecycleAdapter } from "../adapters/stacks/StackPieceLifecycleAdapter";

export interface DimensionProviderPort {
  getCurrentDimension(): string;
}

export interface BibleSetupAdapterParams {
  dimensionProviderPort: DimensionProviderPort;
  configProviderPort: LayoutConfigProvider;
  visualStateRegistryPort: VisualStateRegistry;
  pieceMapperPort: PieceMapper;
  stackPieceLifecycleAdapterPort: StackPieceLifecycleAdapter;
  testamentMapperPort: StackTestamentMapper;
}
