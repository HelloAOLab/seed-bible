import type { ReadonlySignal, Signal } from "@preact/signals";

export interface RenderIconManager {
  mylist: Signal<any[]>;
  firstItemId: ReadonlySignal<string>;
  syncList: (list: any[]) => void;
  setAllowSet: (isAllowSet: boolean) => void;
  setMylist: (list: any[]) => void;
}
