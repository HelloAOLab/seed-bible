import type { PortalCameraType } from "@casual-simulation/aux-common";
import type { EnvironmentAdapterPort } from "../../../application/ports/experience";

export class EnvironmentAdapter implements EnvironmentAdapterPort {
  resetZoomMin() {
    gridPortalBot.tags.portalZoomableMin = null;
  }
  changePortalCameraType(type: PortalCameraType): void {
    gridPortalBot.tags.portalCameraType = type;
  }
  changePortalZoomableMin(value: number): void {
    gridPortalBot.tags.portalZoomableMin = value;
  }
  setGridPortal(value: string): void {
    configBot.tags.gridPortal = value;
  }
  clearMapPortal(): void {
    configBot.tags.mapPortal = undefined;
  }
  clearMiniGridPortal(): void {
    configBot.tags.miniGridPortal = undefined;
  }
  clearMiniMapPortal(): void {
    configBot.tags.miniMapPortal = undefined;
  }
}
