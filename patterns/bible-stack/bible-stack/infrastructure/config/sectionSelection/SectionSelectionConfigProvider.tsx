import type { Scales } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/functions/layout";
import type { Easing } from "../../../../../pattern-typings/AuxLibraryDefinitions";
import type { HexString } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/commonTypes";

export class SectionSelectionConfigProvider {
  getDesiredScale(): number {
    return 1;
  }
  getDesiredFormOpacity(): number {
    return 1;
  }
  getDuration(): number {
    return 0.5;
  }
  getEasing(): Easing {
    return { type: "sinusoidal", mode: "inout" };
  }
  getBookEntranceStaggerMs(): number {
    return 50;
  }
  getWiggleRotationKeyframes(): number[] {
    return [-0.05235988, 0.1308997, -0.05235988, 0];
  }
}
