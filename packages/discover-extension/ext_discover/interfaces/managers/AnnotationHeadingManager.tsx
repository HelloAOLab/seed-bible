import type { Signal } from "@preact/signals";

export interface AnnotationHeadingManager {
  isOpen: Signal<boolean>;
  toggleOpen: () => void;
}
