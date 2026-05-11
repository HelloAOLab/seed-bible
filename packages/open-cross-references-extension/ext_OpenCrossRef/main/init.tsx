/* eslint-disable seed-bible-i18n/i18n-untranslated-content */
import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible.app.api";

registerExtension({
  id: "open-cross-references-extension",
  init: function* (context: SeedBibleState) {
    yield context.discover.registerDiscoverProvider({
      id: "open-cross-references-discover-provider",
      description:
        "Discovers cross references from the Open Cross Ref dataset. See https://www.openbible.info/labs/cross-references/ for more information.",
      title: "Open Cross References",
      discover: async (context) => {
        return [];
      },
    });

    return {};
  },
});
