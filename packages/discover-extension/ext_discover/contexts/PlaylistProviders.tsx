import type { ComponentChildren } from "preact";
import { PlaylistShellProvider } from "ext_discover.contexts.PlaylistShellContext";
import { PlaylistEditProvider } from "ext_discover.contexts.PlaylistEditContext";
import { AnnotationProvider } from "ext_discover.contexts.AnnotationContext";
import { PlaylistGroupsProvider } from "ext_discover.contexts.PlaylistGroupsContext";

export function PlaylistProviders({
  children,
}: {
  children: ComponentChildren;
}) {
  return (
    <PlaylistShellProvider>
      <PlaylistEditProvider>
        <AnnotationProvider>
          <PlaylistGroupsProvider>{children}</PlaylistGroupsProvider>
        </AnnotationProvider>
      </PlaylistEditProvider>
    </PlaylistShellProvider>
  );
}
