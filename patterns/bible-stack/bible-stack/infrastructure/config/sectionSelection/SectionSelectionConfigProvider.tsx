import type { Easing } from "../../../../../pattern-typings/AuxLibraryDefinitions";

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
