import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { MaterialIcon } from "seed-bible.components.icons";
import {
  loadExtensionTranslations,
  useI18n,
} from "seed-bible.i18n.I18nManager";

function OpenGridPortalIcon() {
  return <MaterialIcon>view_in_ar</MaterialIcon>;
}

function OpenMapPortalIcon() {
  return <MaterialIcon>map</MaterialIcon>;
}

registerExtension({
  id: "example-extension",
  init: function* (context: SeedBibleState) {
    loadExtensionTranslations("example-extension", thisBot);

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
          type: "detached",
          detachedAnchor: "side",
          component: () => {
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
      // onSelect: (context) => {
      //   console.log("Example verse tool selected with context:", context);
      //   console.log(
      //     "Selected verse:",
      //     context.readingState.selectedVerses.value
      //   );
      //   const id = context.readingState.decorateVerses(
      //     context.readingState.translationId.value,
      //     context.readingState.bookId.value!,
      //     context.readingState.chapterNumber.value,
      //     context.readingState.selectedVerses.value.map((v) => v.verse.number),
      //     {
      //       style: {
      //         backgroundColor: "#bf7bdf",
      //         textEmphasis: "sesame green",
      //       },
      //     }
      //   );

      //   console.log("decoration id:", id);
      // },
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
            os.toast("Item 1 clicked!");
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
            os.toast("Item 2 clicked!");
          },
        },
      ],
      priority: 100,
    });

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

    yield context.tools.registerEmptyPaneTool({
      id: "open-grid-portal",
      priority: 100,
      title: {
        key: "open-grid-portal",
        defaultValue: "Open grid portal",
        ns: "example-extension",
      },
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
      title: {
        key: "open-map-portal",
        defaultValue: "Open map portal",
        ns: "example-extension",
      },
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

    return {
      abc: () => {
        console.log("This is an exported function from the example extension!");
      },
    };
  },
});
