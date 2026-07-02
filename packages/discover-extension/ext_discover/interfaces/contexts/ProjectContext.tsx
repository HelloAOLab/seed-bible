import type { ReadonlySignal } from "@preact/signals";

export interface ProjectMenuState {
  hideHeadings: boolean;
  areBooksClosed: boolean;
  projectSettings: Record<string, unknown>;
  showVersionHistory: boolean;
}

export interface ProjectContextType {
  menuState: ReadonlySignal<ProjectMenuState>;
  setMenuValue: (value: unknown, name: string) => void;
}
