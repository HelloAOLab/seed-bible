export interface EnvironmentPort {
  resetZoomMin(): void;
  changePortalZoomableMin(value: number): void;
  setGridPortal(value: string): void;
  clearMapPortal(): void;
  clearMiniGridPortal(): void;
  clearMiniMapPortal(): void;
}
