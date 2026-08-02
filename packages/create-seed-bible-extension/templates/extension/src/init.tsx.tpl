import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { useI18n } from "seed-bible/i18n";

// This is a starting point demonstrating a few common extension points.
// For the full API (panes, Discover providers, chat providers, and more),
// see the Seed Bible developer guide: docs/developer-guide.md in the
// seed-bible repository, and packages/seed-bible-refresh-example-extension/
// for a more complete reference.
export default function init{{extensionPascalName}}() {
  registerExtension({
    id: "{{extensionId}}",
    init: function* (context: SeedBibleState) {
      console.log("{{extensionId}} initialized with context:", context);

      // Adds a button to the reader's toolbar. `onSelect` opens a custom
      // pane; `yield`ing the return value registers its cleanup so the
      // button is removed automatically when this extension is uninstalled.
      yield context.tools.registerToolbarTool({
        id: "{{extensionId}}-tool",
        title: {
          key: "tool-title",
          defaultValue: "{{extensionId}}",
          ns: "{{extensionId}}",
        },
        icon: () => <span>★</span>,
        onSelect: () => {
          context.panes.openPane({
            placement: "side",
            title: "{{extensionId}}",
            component: () => {
              const { t } = useI18n("{{extensionId}}");
              return <div style={{ padding: 20 }}>{t("tool-title")}</div>;
            },
          });
        },
        priority: 200,
      });

      // React to app state changes — this logs the current reading
      // position whenever the reader navigates.
      yield effect(() => {
        if (context.app.currentReadingState.value) {
          console.log(
            "Current reading state:",
            context.app.currentReadingState.value.translationId,
            context.app.currentReadingState.value.bookId,
            context.app.currentReadingState.value.chapterNumber
          );
        }
      });

      // Anything returned here (or, in a generator like this one, anything
      // `return`ed rather than `yield`ed) becomes this extension's public
      // export — callable by other extensions that declare it as a
      // dependency.
      return {};
    },
  });
}
