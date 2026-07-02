import { createContext, useContext } from "preact/compat";
import type { ComponentChildren } from "preact";
import type { AnnotationContextType } from "ext_discover.interfaces.contexts.AnnotationContext";
import { createAnnotationManager } from "ext_discover.managers.AnnotationManager";
import { getPlaylistShellManager } from "ext_discover.contexts.PlaylistShellContext";

const AnnotationContext = createContext<AnnotationContextType | undefined>(
  undefined
);

let annotationManagerSingleton: AnnotationContextType | undefined;

export function getAnnotationManager(): AnnotationContextType {
  if (!annotationManagerSingleton) {
    const shell = getPlaylistShellManager();
    annotationManagerSingleton = createAnnotationManager(shell.tab);
  }
  return annotationManagerSingleton;
}

export function AnnotationProvider({
  children,
}: {
  children: ComponentChildren;
}) {
  const manager = getAnnotationManager();

  return (
    <AnnotationContext.Provider value={manager}>
      {children}
    </AnnotationContext.Provider>
  );
}

export function useAnnotationContext(): AnnotationContextType {
  const ctx = useContext(AnnotationContext);
  if (!ctx) {
    throw new Error(
      "useAnnotationContext must be used within AnnotationProvider"
    );
  }
  return ctx;
}
