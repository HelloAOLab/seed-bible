import type { WorldPosition } from "../../domain/models/spatial";

export interface EnvironmentAdapterPort {
  resetZoomMin: () => void;
}

export interface StackManagementService {
  clearAllStacks: () => void;
}

export interface PieceHighlightServicePort {
  clearScheduledUnhighlights(): void;
  clearHighlightedPieces(): void;
}

export interface InteractionRegistryServicePort {
  clearAllLastInteractions: () => void;
}

export interface ExperienceAdapterPort {
  displayExperience(): void;
}

export interface ExperienceConfigProviderPort {
  getInitialBibleCreationDelay(): number;
  getBibleCreationPosition(): WorldPosition;
}

export interface SequenceStateServicePort {
  executeAsSequence(task: () => Promise<void>): Promise<void>;
}

export interface AwaiterPort {
  sleep(ms: number): Promise<void>;
}
