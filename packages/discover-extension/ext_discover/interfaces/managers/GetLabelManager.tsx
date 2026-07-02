import type { Signal } from "@preact/signals";

export interface GetLabelManager {
  isMobile: Signal<boolean>;
  attachContainer: (
    el: HTMLElement | null,
    widthCompare?: number,
    needToShowInMobile?: boolean
  ) => void;
}
