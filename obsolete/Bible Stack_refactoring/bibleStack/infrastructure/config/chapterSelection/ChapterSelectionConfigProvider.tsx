import type { Scales } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/functions/layout";
import type { Easing } from "../../../../../../typings/AuxLibraryDefinitions";
import type { HexString } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/commonTypes";

export class ChapterSelectionConfigProvider {
  getSelectionDuration() {
    return 0.15;
  }
  getSelectionEasing(): Easing {
    return { type: "sinusoidal", mode: "out" };
  }
  getBundleShowBaseDelay() {
    return 35;
  }
  getBundleShowDuration() {
    return 0.15;
  }
  getGroundedMargin() {
    return 0.5;
  }
  getExpandedScales(): Scales {
    return { x: 5, y: 1.5, z: 0.25 };
  }
  getSelectedColor(): HexString {
    return "#f8c471";
  }
}
