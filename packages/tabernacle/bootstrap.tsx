import {
  MaterialIcon,
  PortalComponent,
} from "@packages/seed-bible/seed-bible/components";
import { useI18n } from "@packages/seed-bible/seed-bible/i18n";
import {
  registerExtension,
  type SeedBibleState,
} from "@packages/seed-bible/seed-bible/managers";
import { v4 as uuid } from "uuid";
import tabernaclePattern from "virtual:@pattern/tabernacle";

const extensionId = "tabernacle";

const Icon = () => {
  return <MaterialIcon>camping</MaterialIcon>;
};

export const bootstrapExtension = () => {
  registerExtension({
    id: extensionId,
    init: function* (context: SeedBibleState) {
      yield context.tools.registerBelowReaderTool({
        onSelect: () => {
          const dimension = "tabernacle";
          const inst = uuid();
          context.panes.openPane({
            placement: "floating",
            title: () => {
              const { t } = useI18n();
              return t("title", {
                ns: extensionId,
                defaultValue: "Tabernacle",
              });
            },
            icon: Icon,
            component: () => (
              <PortalComponent
                portal={dimension}
                portalType="grid"
                inst={inst}
                pattern={tabernaclePattern}
                query={{
                  dimension,
                }}
              />
            ),
          });
        },
        id: extensionId,
        priority: 200,
        title: {
          key: "title",
          defaultValue: "Tabernacle",
          ns: extensionId,
        },
        icon: Icon,
      });
    },
  });
};
