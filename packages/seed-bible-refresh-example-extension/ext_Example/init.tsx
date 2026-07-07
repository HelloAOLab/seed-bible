/* eslint-disable seed-bible-i18n/i18n-untranslated-content */
import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { MaterialIcon, PortalComponent } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";

function OpenGridPortalIcon() {
  return <MaterialIcon>view_in_ar</MaterialIcon>;
}

function OpenMapPortalIcon() {
  return <MaterialIcon>map</MaterialIcon>;
}

export default function initExampleExtension() {
  registerExtension({
    id: "example-extension",
    init: function* (context: SeedBibleState) {
      console.log("Example extension initialized with context:", context);

      // register a new tool
      yield context.tools.registerToolbarTool({
        id: "my-example-tool",
        title: {
          key: "my-example-tool",
          defaultValue: "My Example Tool",
          ns: "example-extension",
        },
        icon: () => <span>TOOL!</span>,
        onSelect: () => {
          console.log("Example tool selected!");
          context.panes.openPane({
            placement: "side",
            title: "My Example Tool",
            component: () => {
              // You can use the useI18n hook in your tool component to get translated strings
              const { t } = useI18n("example-extension");
              return <div style={{ padding: 20 }}>{t("my-example-tool")}</div>;
            },
          });
        },
        priority: 100,
      });

      yield context.tools.registerVerseToolbarTool({
        id: "my-verse-tool",
        title: {
          key: "my-verse-tool",
          defaultValue: "My Verse Tool",
          ns: "example-extension",
        },
        icon: () => <span>VERSE!</span>,
        // You can use getItems to return the list of items for the toolbar dynamically based on the context
        getItems: (context) => [
          {
            id: "item-1",
            icon: () => <span>ITEM 1</span>,
            title: {
              key: "item-1",
              defaultValue: "Item 1",
              ns: "example-extension",
            },
            onSelect: () => {
              console.log("Item 1 clicked with context:", context);
              context.toast("Item 1 clicked!");
            },
          },
          {
            id: "item-2",
            icon: () => <span>ITEM 2</span>,
            title: {
              key: "item-2",
              defaultValue: "Item 2",
              ns: "example-extension",
            },
            onSelect: () => {
              console.log("Item 2 clicked with context:", context);
              context.toast("Item 2 clicked!");
            },
          },
        ],
        priority: 100,
      });

      // Below reader tools are displayed in a toolbar below the bible reader
      yield context.tools.registerBelowReaderTool({
        id: "my-below-reader-tool",
        title: {
          key: "my-below-reader-tool",
          defaultValue: "My Below Reader Tool",
          ns: "example-extension",
        },
        icon: () => <span>BELOW!</span>,
        priority: 100,
      });

      // Toolbar tools can open a pane directly via context.panesManager.openPane.
      // Both tools below share the same stable pane id, so opening either one
      // replaces the other's content in place rather than opening a second
      // pane — only one of these portals is ever open at a time.
      yield context.tools.registerToolbarTool({
        id: "open-grid-portal",
        priority: 200,
        title: {
          key: "open-grid-portal",
          defaultValue: "Open grid portal",
          ns: "example-extension",
        },
        icon: OpenGridPortalIcon,
        onSelect: (context) => {
          context.panesManager.openPane({
            id: "example-portal-pane",
            placement: "floating",
            title: "Grid Portal",
            component: () => (
              <PortalComponent
                portal="home"
                portalType="grid"
                inst={crypto.randomUUID()}
                pattern={null}
              />
            ),
          });
        },
      });

      yield context.tools.registerToolbarTool({
        id: "open-map-portal",
        priority: 210,
        title: {
          key: "open-map-portal",
          defaultValue: "Open map portal",
          ns: "example-extension",
        },
        icon: OpenMapPortalIcon,
        onSelect: (context) => {
          context.panesManager.openPane({
            id: "example-portal-pane",
            placement: "floating",
            title: "Map Portal",
            component: () => (
              <PortalComponent
                portal="map_portal"
                portalType="map"
                inst={crypto.randomUUID()}
                pattern={null}
              />
            ),
          });
        },
      });

      // You can use effects in your extension to react to changes in the app state. For example, this effect will log the current reading state whenever it changes.
      yield effect(() => {
        if (context.app.currentReadingState.value) {
          console.log(
            "Current reading state in effect:",
            context.app.currentReadingState.value.translationId,
            context.app.currentReadingState.value.bookId,
            context.app.currentReadingState.value.chapterNumber
          );
        }
      });

      // You can return a value to export functions or data from your extension that can be used by other extensions.
      // For example, this will export a function called "abc" that other extensions can call if they have a reference to this extension.
      return {
        abc: () => {
          console.log(
            "This is an exported function from the example extension!"
          );
        },
      };
    },
  });
}
