import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";
import type { Easing } from "../../../../../pattern-typings/AuxLibraryDefinitions";

const pacingMap: Record<StackUpdatePacing, number> = {
  Fast: 0.25,
  Regular: 0.5,
  Slow: 1,
  Instant: 0,
};

export class StackUpdateConfigProvider {
  getDuration(pacing: StackUpdatePacing): number {
    return pacingMap[pacing];
  }
  getEasing(): Easing {
    return { type: "sinusoidal", mode: "inout" };
  }
}
