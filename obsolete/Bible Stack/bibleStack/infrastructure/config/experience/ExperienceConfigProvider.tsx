import type { PortalCameraType } from "@casual-simulation/aux-common";
import type { ExperienceConfigProviderPort as ExperienceAdapterConfigProviderPort } from "bibleStack.infrastructure.ports.experience";
import type { ExperienceConfigProviderPort as ExperienceServiceConfigProviderPort } from "@packages/Bible Stack/bibleStack/application/ports/experience";
import type { WorldPosition } from "bibleStack.domain.models.spatial";

const TARGET_DIMENSION = "stack";
const TARGET_PORTAL_CAMERA_TYPE: PortalCameraType = "orthographic";
const TARGET_PORTAL_ZOOMABLE_MIN = 5;
const APP_TITLE = "Stack";
const APP_POSITION = { x: 200, y: 150 };
const APP_SIZE = { width: 350, height: 200 };
const APP_TYPE = "canvas";
const ININITAL_BIBLE_CREATION_DELAY = 500;
const BIBLE_CREATION_POSITION = { x: 0, y: 0, z: 0 };

export class ExperienceConfigProvider
  implements
    ExperienceAdapterConfigProviderPort,
    ExperienceServiceConfigProviderPort
{
  getTargetDimension(): string {
    return TARGET_DIMENSION;
  }
  getTargetPortalCameraType(): PortalCameraType {
    return TARGET_PORTAL_CAMERA_TYPE;
  }
  getTargetPortalZoomableMin(): number {
    return TARGET_PORTAL_ZOOMABLE_MIN;
  }
  getAppTitle(): string {
    return APP_TITLE;
  }
  getAppPosition(): { x: number; y: number } {
    return APP_POSITION;
  }
  getAppSize(): { width: number; height: number } {
    return APP_SIZE;
  }
  getAppType(): string {
    return APP_TYPE;
  }
  getInitialBibleCreationDelay(): number {
    return ININITAL_BIBLE_CREATION_DELAY;
  }

  getBibleCreationPosition(): WorldPosition {
    return BIBLE_CREATION_POSITION;
  }
}
