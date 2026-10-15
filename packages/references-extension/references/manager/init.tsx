import type {
  Pane,
  SeedBibleState,
} from "@packages/seed-bible/seed-bible/managers";
import { signal } from "@preact/signals";
import { registerExtension } from "seed-bible";
import { offerReferenceDownload } from "./askToDownload";
import {
  REFERENCES_CONTENT_TYPE,
  createReferencesDiscoverProvider,
} from "./discover";

export default function initReferencesExtension() {
  registerExtension({
    id: "ext_references",
    init: function* (context: SeedBibleState) {
      yield offerReferenceDownload(context);

      const currentOpenedPane = signal<Pane | null>(null);

      yield context.discover.registerContentType({
        id: REFERENCES_CONTENT_TYPE,
        title: {
          key: "title",
          ns: "ext_references",
          defaultValue: "References",
        },
        // A card for every verse would bury everything else in "All", so the
        // cards wait for their chip, as the People/Places/Events types do.
        hiddenByDefault: true,
        layout: "custom",
        priority: 130,
      });

      yield context.discover.registerDiscoverProvider(
        createReferencesDiscoverProvider({
          context,
          currentPane: currentOpenedPane,
        })
      );
    },
  });
}
