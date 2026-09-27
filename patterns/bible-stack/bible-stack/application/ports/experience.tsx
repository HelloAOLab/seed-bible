import type { WorldPosition } from "../../domain/models/spatial";

export interface EnvironmentAdapterPort {
  resetZoomMin: () => void;
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

export interface AwaiterPort {
  sleep(ms: number): Promise<void>;
}
