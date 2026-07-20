import type { Easing } from "../../../../../pattern-typings/AuxLibraryDefinitions";
import type { StackUpdatePacing } from "../../../domain/models/stacks";

const DURATIONS: Record<StackUpdatePacing, number> = {
  Fast: 0.5,
  Regular: 1,
  Slow: 2,
  Instant: 0,
} as const;

const EASING = { type: "sinusoidal", mode: "inout" } as Easing;

const SECTION_INITIAL_SCALE_Z = 0.1;

const DESIRED_SCALE = 1.1;

const DESIRED_FORM_OPACITY = 1;

export class TestamentSelectionConfigProvider {
  getDuration<K extends StackUpdatePacing>(pacing: K): (typeof DURATIONS)[K] {
    return DURATIONS[pacing];
  }

  getEasing(): Easing {
    return EASING;
  }

  getSectionInitialScaleZ() {
    return SECTION_INITIAL_SCALE_Z;
  }

  getDesiredScale() {
    return DESIRED_SCALE;
  }

  getDesiredFormOpacity() {
    return DESIRED_FORM_OPACITY;
  }
}
