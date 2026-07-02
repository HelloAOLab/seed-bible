import { effect, signal } from "@preact/signals";
import type { ProjectContextManager } from "ext_discover.interfaces.managers.ProjectContextManager";
import type { ProjectMenuState } from "ext_discover.interfaces.contexts.ProjectContext";

const G = globalThis as Record<string, any>;

let projectContextManagerSingleton: ProjectContextManager | undefined;

export function createProjectContextManager(): ProjectContextManager {
  const menuState = signal<ProjectMenuState>({
    hideHeadings: false,
    areBooksClosed: false,
    projectSettings: {},
    showVersionHistory: false,
  });

  const setMenuValue = (value: unknown, name: string) => {
    menuState.value = {
      ...menuState.value,
      [name]: value,
    };
  };

  effect(() => {
    G.ProjectMenuState = { ...menuState.value };
  });

  effect(() => {
    G.SetProjectMenuState = (next: ProjectMenuState) => {
      menuState.value = next;
    };
    return () => {
      G.SetProjectMenuState = null;
    };
  });

  return {
    menuState,
    setMenuValue,
  };
}

export function getProjectContextManager(): ProjectContextManager {
  if (!projectContextManagerSingleton) {
    projectContextManagerSingleton = createProjectContextManager();
  }
  return projectContextManagerSingleton;
}
