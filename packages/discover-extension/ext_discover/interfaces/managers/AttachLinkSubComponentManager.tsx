import type { ReadonlySignal, Signal } from "@preact/signals";

export interface AttachLinkSubComponentManager {
  isWarningModalShow: Signal<boolean>;
  setIsWarningModalShow: (value: boolean) => void;
  recordingSwitchCallback: (callback: () => void) => void;
}
