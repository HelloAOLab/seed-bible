import type { Easing } from "../../../../../pattern-typings/AuxLibraryDefinitions";
import { SelectionLayout } from "./layout";

const duration = 0.3;
const firstSequenceEasing = { type: "sinusoidal", mode: "out" } as const;
const secondSequenceEasing = { type: "cubic", mode: "out" } as const;

export class VersesBundleConfigProvider {
  getLayoutParam<K extends keyof typeof SelectionLayout>(
    key: K
  ): (typeof SelectionLayout)[K] {
    return SelectionLayout[key];
  }

  getDuration() {
    return duration;
  }

  getFirstSequenceEasing(): Easing {
    return firstSequenceEasing;
  }

  getSecondSequenceEasing(): Easing {
    return secondSequenceEasing;
  }
}
