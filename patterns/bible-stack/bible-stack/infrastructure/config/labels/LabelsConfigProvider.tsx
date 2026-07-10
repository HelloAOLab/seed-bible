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
import type { ShowSequencePacing } from "../../../domain/models/label";

type FontsSchema = typeof Fonts;

type FontName = keyof FontsSchema;

type FontData = FontsSchema[FontName];

export type { FontName, FontData };

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
}
