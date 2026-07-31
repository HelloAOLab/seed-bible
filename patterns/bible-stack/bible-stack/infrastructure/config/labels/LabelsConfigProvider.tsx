import { Fonts } from "./fonts";
import {
  DialogBoxFormAddresses,
  type DialogBoxFormAddress,
} from "./formAddresses";
import { LabelDateConfigs, type LabelDateConfig } from "./date";
import {
  ShowAnimationDurationMap,
  ShowAnimationConfig,
  type ShowAnimationDurationMapType,
  type ShowAnimationConfigType,
} from "./showAnimation";
import {
  LabelTranslucencyModes,
  type LabelTranslucencyMode,
  type ShowSequencePacing,
} from "../../../domain/models/label";
import { MEASUREMENTS, type MeasurementsType } from "./measurements";
import type { Scales } from "../../functions/layout";
import type { Vector3 as Vector3Type } from "../../../../../pattern-typings/AuxLibraryDefinitions";

type FontsSchema = typeof Fonts;

type FontName = keyof FontsSchema;

type FontData = FontsSchema[FontName];

export type { FontName, FontData };

const OPACITY_MAP: Record<LabelTranslucencyMode, number> = {
  [LabelTranslucencyModes.Faded]: 0.5,
  [LabelTranslucencyModes.Solid]: 1,
};

export class LabelsConfigProvider {
  getFontData(font: FontName): FontData {
    return Fonts[font];
  }
  getDialogBoxFormAddresses(): DialogBoxFormAddress {
    return DialogBoxFormAddresses;
  }

  getDialogBoxFormAddress<K extends keyof DialogBoxFormAddress>(
    key: K
  ): DialogBoxFormAddress[K] {
    return this.getDialogBoxFormAddresses()[key];
  }

  getDialogBoxAspectRatios(): Array<keyof DialogBoxFormAddress> {
    return Object.keys(DialogBoxFormAddresses).map(Number) as Array<
      keyof DialogBoxFormAddress
    >;
  }

  getDateConfig<K extends keyof LabelDateConfig>(key: K): LabelDateConfig[K] {
    return LabelDateConfigs[key];
  }

  getShowAnimationDuration<P extends ShowSequencePacing>(
    pacing: P
  ): ShowAnimationDurationMapType[P] {
    return ShowAnimationDurationMap[pacing];
  }

  getShowAnimationConfig<K extends keyof ShowAnimationConfigType>(
    key: K
  ): ShowAnimationConfigType[K] {
    return ShowAnimationConfig[key];
  }

  getMeasurement<K extends keyof MeasurementsType>(
    key: K
  ): MeasurementsType[K] {
    return MEASUREMENTS[key];
  }

  getOpacity<K extends LabelTranslucencyMode>(
    mode: K
  ): (typeof OPACITY_MAP)[K] {
    return OPACITY_MAP[mode];
  }

  getTransformerDesiredScales(): Scales {
    return {
      x: MEASUREMENTS.TransformerDesiredScaleX,
      y: MEASUREMENTS.TransformerDesiredScaleY,
      z: MEASUREMENTS.TransformerDesiredScaleZ,
    };
  }

  getTransformerOffset(): Vector3Type {
    return new Vector3(
      MEASUREMENTS.TransformeOffsetX,
      MEASUREMENTS.TransformeOffsetY,
      MEASUREMENTS.TransformeOffsetZ
    );
  }
}
