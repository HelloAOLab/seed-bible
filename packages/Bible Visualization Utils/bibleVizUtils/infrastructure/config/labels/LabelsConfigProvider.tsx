import { Fonts } from "bibleVizUtils.infrastructure.config.labels.fonts";
import {
  DialogBoxFormAddresses,
  type DialogBoxFormAddressesType,
} from "bibleVizUtils.infrastructure.config.labels.formAddresses";
import {
  LabelDateConfigs,
  type LabelDateConfigsType,
} from "bibleVizUtils.infrastructure.config.labels.date";
import {
  ShowAnimationDurationMap,
  ShowAnimationConfig,
  type ShowAnimationDurationMapType,
  type ShowAnimationConfigType,
} from "bibleVizUtils.infrastructure.config.labels.showAnimation";
import { type ShowAnimationPacing } from "bibleVizUtils.infrastructure.models.label";

type FontsSchema = typeof Fonts;

type FontName = keyof FontsSchema;

type FontData = FontsSchema[FontName];

export type { FontName, FontData };

export class LabelsConfigProvider {
  getFontData(font: FontName): FontData {
    return Fonts[font];
  }
  getDialogBoxFormAddresses(): DialogBoxFormAddressesType {
    return DialogBoxFormAddresses;
  }

  getDialogBoxFormAddress<K extends keyof DialogBoxFormAddressesType>(
    key: K
  ): DialogBoxFormAddressesType[K] {
    return this.getDialogBoxFormAddresses()[key];
  }

  getDialogBoxAspectRatios(): Array<keyof DialogBoxFormAddressesType> {
    return Object.keys(DialogBoxFormAddresses).map(Number) as Array<
      keyof DialogBoxFormAddressesType
    >;
  }

  getDateConfig<K extends keyof LabelDateConfigsType>(
    key: K
  ): LabelDateConfigsType[K] {
    return LabelDateConfigs[key];
  }

  getShowAnimationDuration<P extends ShowAnimationPacing>(
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
