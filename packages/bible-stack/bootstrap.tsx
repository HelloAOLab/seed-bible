import { MaterialIcon } from "@packages/seed-bible/seed-bible/components";
import {
  registerExtension,
  type SeedBibleState,
} from "@packages/seed-bible/seed-bible/managers";
import type { UtilsAPI } from "@packages/seed-bible-utils/infrastructure/models/seedBible";
import { v4 as uuid } from "uuid";
import bibleStackPattern from "virtual:@pattern/bible-stack";

const Icon = () => {
  return <MaterialIcon>layers</MaterialIcon>;
};

const seedBibleUtilsId = "seed-bible-utils";

interface DependenciesMap {
  [seedBibleUtilsId]: UtilsAPI;
}

const dependencies: (keyof DependenciesMap)[] = [seedBibleUtilsId];

export const bootstrapExtension = () => {
  registerExtension({
    id: "bible-stack",
    dependencies,
    init: function* (context: SeedBibleState, dependenciesMap) {
      const { bookNames } = dependenciesMap[
        seedBibleUtilsId
      ] as DependenciesMap[typeof seedBibleUtilsId];

      context.tools.registerBelowReaderTool({
        onSelect: () => {
          // The arrangement and per-book static info are bundled inside the
          // pattern itself (they're large and overflowed the iframe URL). Only
          // the book names — which are language-dependent — travel through the
          // pattern's configBot tags.
          const dimension = "stack";
          context.panes.openPane({
            type: "detached",
            gridPortal: dimension,
            pattern: bibleStackPattern,
            inst: uuid(),
            query: {
              dimension,
              bookNames: JSON.stringify(Object.fromEntries(bookNames.value)),
              language: context.i18n.language.value,
            },
          });
        },
        id: "bible-stack",
        title: "bible-stack",
        icon: Icon,
        priority: 0,
      });

      yield () => {};
    },
  });
};
