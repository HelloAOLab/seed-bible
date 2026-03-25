import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { MaterialIcon } from "seed-bible.components.icons";

function OpenGridPortalIcon() {
  return <MaterialIcon>view_in_ar</MaterialIcon>;
}

function OpenMapPortalIcon() {
  return <MaterialIcon>map</MaterialIcon>;
}

const cleanup = registerExtension({
  id: "example-extension",
  init: function* (context: SeedBibleState) {
    console.log("Example extension initialized with context:", context);

    // register a new tool
    yield context.tools.registerToolbarTool({
      id: "my-example-tool",
      title: "My Example Tool",
      icon: () => <span>TOOL!</span>,
      onSelect: () => {
        console.log("Example tool selected!");
        context.panes.openPane({
          type: "detached",
          component: () => (
            <div style={{ padding: 20 }}>Hello from the example extension!</div>
          ),
        });
      },
      priority: 100,
    });

    yield context.tools.registerVerseToolbarTool({
      id: "my-verse-tool",
      title: "My Verse Tool",
      icon: () => <span>VERSE!</span>,
      onSelect: (context) => {
        console.log("Example verse tool selected with context:", context);
        console.log(
          "Selected verse:",
          context.readingState.selectedVerses.value
        );
      },
      priority: 100,
    });

    yield context.tools.registerBelowReaderTool({
      id: "my-below-reader-tool",
      title: "My Below Reader Tool",
      icon: () => <span>BELOW!</span>,
      priority: 100,
    });

    yield context.tools.registerEmptyPaneTool({
      id: "open-grid-portal",
      priority: 100,
      title: "Open grid portal",
      icon: OpenGridPortalIcon,
      isDisabled: (context) =>
        context.panesManager.panes.value.some(
          (pane) =>
            (pane.gridPortal !== null || pane.mapPortal !== null) &&
            pane.id !== context.currentPane.id
        ),
      onSelect: (context) => {
        create({
          home: true,
          color: "red",
        });
        context.panesManager.openInPane(context.currentPane.id, {
          gridPortal: "home",
        });
      },
    });

    yield context.tools.registerEmptyPaneTool({
      id: "open-map-portal",
      priority: 110,
      title: "Open map portal",
      icon: OpenMapPortalIcon,
      isDisabled: (context) =>
        context.panesManager.panes.value.some(
          (pane) =>
            (pane.gridPortal !== null || pane.mapPortal !== null) &&
            pane.id !== context.currentPane.id
        ),
      onSelect: (context) => {
        context.panesManager.closePane(context.currentPane.id);
        context.panesManager.openPane({
          type: "detached",
          mapPortal: "map_portal",
        });
      },
    });
  },
});
