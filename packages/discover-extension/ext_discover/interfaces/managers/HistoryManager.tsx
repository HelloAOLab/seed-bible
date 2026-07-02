import type { ReadonlySignal, Signal } from "@preact/signals";

export interface HistoryManager {
  history: Signal<any[]>;
  setHistory: (value: any[] | ((prev: any[]) => any[])) => void;
  addDataToHistory: (data: any) => void;
  deleteDataFromHistory: (index: number | string[]) => void;
  historyList: ReadonlySignal<any[]>;
}
