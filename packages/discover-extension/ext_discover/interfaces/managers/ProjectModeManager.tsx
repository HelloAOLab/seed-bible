import type { ComponentType } from "preact";
import type { ReadonlySignal, Signal } from "@preact/signals";
import type { ChapterKey } from "ext_discover.hooks.areKeysEqual";
import type { ProjectModeProps } from "ext_discover.interfaces.components.ProjectMode";

export interface ProjectModeManagerInit extends Pick<
  ProjectModeProps,
  | "setMode"
  | "showPlaylistSettings"
  | "setShowPlaylistSettings"
  | "setTab"
  | "onReset"
> {}

export interface ProjectModeManager {
  showMoreOptions: Signal<boolean>;
  publishAccess: Signal<string>;
  loading: Signal<boolean>;
  arrangementIndex: number;
  mapMode: Signal<unknown>;
  project: Signal<Record<string, any>>;
  selection: Signal<Record<string, any>>;
  isInSelectionMode: Signal<boolean>;
  selectedChaptersKeys: ReadonlySignal<ChapterKey[]>;
  showMorePosition: { current: Record<string, unknown> };
  showPlaylistPosition: { current: Record<string, unknown> };
  scriptureMap2D: ComponentType<Record<string, unknown>> | null;
  setShowMoreOptions: (value: boolean) => void;
  setShowPlaylistSettings: (value: boolean) => void;
  setMode: (mode: string) => void;
  clearSelection: () => void;
  handleChapterClick: (e: any, key: ChapterKey, checked: boolean) => void;
  handleChapterClickAndHold: (
    e: any,
    key: ChapterKey,
    checked: boolean
  ) => void;
  handleBookNameClickAndHold: (
    showChapters: boolean,
    key: Omit<ChapterKey, "chapterIndex">,
    checked: boolean
  ) => void;
  handleSelectionModeCheckboxClick: () => void;
  handleSelectionModeDoneButtonClick: () => void;
  handleStateSetterOptionClick: (state: unknown) => void;
  getOnChapterClickDependencies: () => unknown[];
  getOnBookNameClickAndHoldDependencies: () => unknown[];
  openShowPlaylistSettings: (e: any) => void;
  openShowMoreOptions: (e: any) => void;
  closeShowPlaylistSettings: (e: any) => void;
  syncInit: (init: ProjectModeManagerInit) => void;
}
