import type { PortalCameraType } from "@casual-simulation/aux-common";

export interface ExperienceServicePort {
  handleSomeExperienceClosed(id: string): void;
}

export interface ExperienceConfigProviderPort {
  getTargetDimension(): string;
  getTargetPortalCameraType(): PortalCameraType;
  getTargetPortalZoomableMin(): number;
  getAppTitle(): string;
  getAppPosition(): { x: number; y: number };
  getAppSize(): { width: number; height: number };
  getAppType(): string;
}

export interface EnvironmentAdapterPort {
  changePortalCameraType(type: PortalCameraType): void;
  changePortalZoomableMin(value: number): void;
  setGridPortal(value: string): void;
  clearMapPortal(): void;
  clearMiniGridPortal(): void;
  clearMiniMapPortal(): void;
}
