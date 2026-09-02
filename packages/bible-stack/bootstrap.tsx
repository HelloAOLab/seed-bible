import {
  MaterialIcon,
  PortalComponent,
} from "@packages/seed-bible/seed-bible/components";
import {
  registerExtension,
  type SeedBibleState,
} from "@packages/seed-bible/seed-bible/managers";
import { useI18n } from "@packages/seed-bible/seed-bible/i18n";
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

      yield context.tools.registerBelowReaderTool({
        onSelect: () => {
          const dimension = "stack";
          const inst = uuid();
          context.panes.openPane({
            placement: "floating",
            title: () => {
              const { t } = useI18n();
              return t("below-reader-tool", {
                ns: "bible-stack",
                defaultValue: "Bible Stack",
              });
            },
            icon: Icon,
            component: () => (
              <PortalComponent
                portal={dimension}
                portalType="grid"
                inst={inst}
                pattern={bibleStackPattern}
                query={{
                  dimension,
                  bookNames: JSON.stringify(
                    Object.fromEntries(bookNames.value)
                  ),
                  language: context.i18n.language.value,
                }}
              />
            ),
          });
        },
        id: "bible-stack",
        title: {
          key: "below-reader-tool",
          defaultValue: "Bible Stack",
          ns: "bible-stack",
        },
        icon: Icon,
        priority: 0,
      });
    },
  });
};
