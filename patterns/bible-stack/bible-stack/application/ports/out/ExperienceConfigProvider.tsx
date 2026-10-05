import type { WorldPosition } from "../../../domain/models/spatial";

export interface ExperienceConfigProviderPort {
  getTargetPortalZoomableMin(): number;
  getAppTitle(): string;
  getAppPosition(): { x: number; y: number };
  getAppSize(): { width: number; height: number };
  getAppType(): string;
  getInitialBibleCreationDelay(): number;
  getBibleCreationPosition(): WorldPosition;
}
