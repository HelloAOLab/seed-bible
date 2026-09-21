import type { Easing } from "../../../../../pattern-typings/AuxLibraryDefinitions";
import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";
import { CAMERA_FRAMING_MAP } from "./cameraFramingMap";

const BLINK_DURATION = 1;
const DEFAULT_CAMERA_ZOOM = 40;
const CAMERA_POLAR = 1.01229;
const CAMERA_INITIAL_AZIMUTH = 0.5;
const CAMERA_ORBIT_DURATION = 85;
const CAMERA_ORBIT_EASE_IN_ARC = Math.PI / 2;
const CAMERA_ORBIT_EASE_IN_DURATION =
  (CAMERA_ORBIT_EASE_IN_ARC * CAMERA_ORBIT_DURATION) / 4;
const BLINK_INITIAL_COLOR = "#ffffff";
const BLINK_TARGET_COLOR = "#8df5f3";
const CONE_BLINK_TARGET_OPACITY = 0.75;
const CONE_BLINK_INITIAL_OPACITY = 0;
const ORBIT_INITIAL_EASING: Easing = {
  mode: "in",
  type: "sinusoidal",
};
const ORBIT_REGULAR_EASING: Easing = {
  mode: "inout",
  type: "linear",
};

export interface CameraFraming {
  zoom: number;
  polar: number;
  initialAzimuth: number;
  orbitAzimuth: number;
}

export class PieceHighlightConfigProvider {
  getBlinkDuration(): number {
    return BLINK_DURATION;
  }
  getCameraOrbitDuration(): number {
    return CAMERA_ORBIT_DURATION;
  }
  getCameraOrbitEaseInDuration(): number {
    return CAMERA_ORBIT_EASE_IN_DURATION;
  }
  getBlinkInitialColor(): string {
    return BLINK_INITIAL_COLOR;
  }
  getBlinkTargetColor(): string {
    return BLINK_TARGET_COLOR;
  }
  getConeBlinkTargetOpacity(): number {
    return CONE_BLINK_TARGET_OPACITY;
  }
  getConeBlinkInitialOpacity(): number {
    return CONE_BLINK_INITIAL_OPACITY;
  }
  getCameraOrbitInitialEasing(): Easing {
    return ORBIT_INITIAL_EASING;
  }
  getCameraOrbitRegularEasing(): Easing {
    return ORBIT_REGULAR_EASING;
  }
  getCameraFraming<E extends ExperienceKey>(
    experience: E,
    key: ExperienceKeyMap[E]
  ): CameraFraming {
    const override = CAMERA_FRAMING_MAP[experience][key];
    const initialAzimuth =
      override?.rotation?.azimuth ?? CAMERA_INITIAL_AZIMUTH;

    return {
      zoom: override?.zoom ?? DEFAULT_CAMERA_ZOOM,
      polar: override?.rotation?.polar ?? CAMERA_POLAR,
      initialAzimuth,
      orbitAzimuth: initialAzimuth + CAMERA_ORBIT_EASE_IN_ARC,
    };
  }
}
