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
      const {
        arrangementService,
        arrangementConfigProvider,
        customArrangementStore,
        dataRepository,
        bookNames,
      } = dependenciesMap[
        seedBibleUtilsId
      ] as DependenciesMap[typeof seedBibleUtilsId];

      context.tools.registerBelowReaderTool({
        onSelect: () => {
          // The arrangement is frozen at open time (snapshot). Resolve the raw
          // config of the currently-selected arrangement (static or custom) by
          // the service's current index, and pass it — plus the static book
          // info — into the pattern via configBot tags.
          const rawArrangements = [
            ...arrangementConfigProvider.getRawStaticArrangements(),
            ...customArrangementStore.getRawArrangements(),
          ];
          const currentArrangement =
            rawArrangements[arrangementService.getCurrentArrangementIndex()];

          context.panes.openPane({
            type: "detached",
            gridPortal: "grid",
            pattern: bibleStackPattern,
            inst: uuid(),
            query: {
              arrangement: JSON.stringify(currentArrangement),
              booksStaticInfo: JSON.stringify(
                dataRepository.getBooksStaticInfo()
              ),
              bookNames: JSON.stringify(Object.fromEntries(bookNames.value)),
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
