import type { Signal } from "@preact/signals";

export interface AnnotationListFiltersManager {
  dateOption: Signal<string>;
  setFromInputRef: (element: HTMLInputElement | null) => void;
  setToInputRef: (element: HTMLInputElement | null) => void;
  syncDateOption: (value: string) => void;
}
