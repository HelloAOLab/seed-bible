import type { HistoryModeEventPort } from "bibleVizUtils.domain.ports.historyMode";

interface HistoryModeServiceProps {
  isInHistoryMode?: boolean;
  eventPort: HistoryModeEventPort;
}

export class HistoryModeService {
  #isInHistoryMode: NonNullable<HistoryModeServiceProps["isInHistoryMode"]>;
  #eventPort: HistoryModeServiceProps["eventPort"];

  constructor({ isInHistoryMode = false, eventPort }: HistoryModeServiceProps) {
    this.#isInHistoryMode = isInHistoryMode;
    this.#eventPort = eventPort;
  }

  get isInHistoryMode() {
    return this.#isInHistoryMode;
  }

  enterHistoryMode() {
    if (this.#isInHistoryMode === false) {
      this.#isInHistoryMode = true;
      this.#eventPort.emit("OnEnterHistoryMode");
    }
  }

  exitHistoryMode() {
    if (this.#isInHistoryMode === true) {
      this.#isInHistoryMode = false;
      this.#eventPort.emit("OnExitHistoryMode");
    }
  }
}
