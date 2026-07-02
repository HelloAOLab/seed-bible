import type { Signal } from "@preact/signals";
import type { CurrentOpenedBook } from "ext_discover.models.playlist";

export interface AnnotationManager {
  annotationData: Signal<unknown[]>;
  annotationSources: Signal<unknown[]>;
  tagsSources: Signal<unknown[]>;
  fetchingAnnotation: Signal<boolean>;
  currentOpenedBook: Signal<CurrentOpenedBook>;
  authSwitch: Signal<boolean>;
  setAnnotationData: (
    value: unknown[] | ((prev: unknown[]) => unknown[])
  ) => void;
  setCurrentOpenedBook: (value: CurrentOpenedBook) => void;
  setAuthSwitch: (value: boolean) => void;
}
