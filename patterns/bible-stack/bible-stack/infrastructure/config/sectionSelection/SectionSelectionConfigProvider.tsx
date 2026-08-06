import type { Easing } from "../../../../../pattern-typings/AuxLibraryDefinitions";
import type { StackUpdatePacing } from "../../../domain/models/stacks";

const DURATIONS: Record<StackUpdatePacing, number> = {
  Fast: 0.25,
  Regular: 0.5,
  Slow: 1,
  Instant: 0,
} as const;

const BOOK_ENTRANCE_STAGGER_MS = 50;

export class SectionSelectionConfigProvider {
  getDesiredScale(): number {
    return 1;
  }
  getDesiredFormOpacity(): number {
    return 1;
  }
  getDuration(pacing: StackUpdatePacing = "Regular"): number {
    return DURATIONS[pacing];
  }
  getEasing(): Easing {
    return { type: "sinusoidal", mode: "inout" };
  }
  getBookEntranceStaggerMs(pacing: StackUpdatePacing = "Regular"): number {
    return pacing === "Instant" ? 0 : BOOK_ENTRANCE_STAGGER_MS;
  }
  getWiggleRotationKeyframes(): number[] {
    return [-0.05235988, 0.1308997, -0.05235988, 0];
  }
}
