import { createContext, useContext } from "preact/compat";
import type { ComponentChildren } from "preact";
import type { ProjectContextType } from "ext_discover.interfaces.contexts.ProjectContext";
import { getProjectContextManager } from "ext_discover.managers.ProjectContextManager";

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ComponentChildren }) {
  const manager = getProjectContextManager();

  return (
    <ProjectContext.Provider value={manager}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext(): ProjectContextType {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProjectContext must be used within ProjectProvider");
  }
  return ctx;
}

export function useProjectMenu() {
  const ctx = useProjectContext();
  return {
    menuState: ctx.menuState,
    setMenuValue: ctx.setMenuValue,
  };
}
