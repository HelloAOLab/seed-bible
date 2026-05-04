import type { WorldPosition } from "bibleStack.domain.models.spatial";

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
  closeExperience(id: string): void;
  displayExperience(): string;
}

export interface ScripturePiecesStateServicePort {
  resetToDefault(): void;
  readonly arePiecesDraggable: boolean;
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

export interface StackPresenceNavigationPort {
  update(): Promise<void>;
}

export interface AwaiterPort {
  sleep(ms: number): Promise<void>;
}
