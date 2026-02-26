import { bibleVizUtilsEventManager } from "bibleVizUtils.services.EventManager";

let isInHistoryMode = false;

export const GetIsInHistoryMode = () => isInHistoryMode;

const setIsInHistoryMode: (value: boolean) => void = (value) => {
  isInHistoryMode = value;
  const eventName = value ? "OnEnterHistoryMode" : "OnExitHistoryMode";
  bibleVizUtilsEventManager.emit(eventName);
};

export const enterHistoryMode = () => {
  if (isInHistoryMode === false) {
    setIsInHistoryMode(true);
  }
};

export const exitHistoryMode = () => {
  if (isInHistoryMode === true) {
    setIsInHistoryMode(false);
  }
};

export const toggleHistoryMode = () => {
  setIsInHistoryMode(!isInHistoryMode);
};
