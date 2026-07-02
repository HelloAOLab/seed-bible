import {
  registerExtension,
  type ExtensionDependencies,
  type SeedBibleState,
} from "seed-bible.app.api";
import { PlaylistApp } from "ext_discover.app.PlaylistApp";

const extensionId = "discover-extension";

export const registerDiscoverExtension = () => {
  registerExtension({
    id: extensionId,
    dependencies: [],
    init: function* (
      context: SeedBibleState,
      _dependencies: ExtensionDependencies
    ) {
      yield context.tools.registerToolbarTool({
        id: extensionId,
        title: {
          key: "Discovery",
          defaultValue: "Discovery",
          ns: extensionId,
        },
        icon: () => (
          <span className="material-symbols-outlined">playlist_play</span>
        ),
        onSelect: () => {
          context.panes.openPane({
            type: "detached",
            detachedAnchor: "side",
            component: () => (
              <div style={{ height: "100%", width: "100%" }}>
                <PlaylistApp />
              </div>
            ),
          });
        },
        priority: 100,
      });
    },
  });
};
