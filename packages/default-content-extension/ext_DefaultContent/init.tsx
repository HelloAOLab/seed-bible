import type { DiscoverContentResult } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { useI18n } from "seed-bible/i18n";
import {
  findDiscoveredContentForChapter,
  type DiscoveredContentItem,
} from "./discoveredContent";

function DiscoveredContentLink(props: { item: DiscoveredContentItem }) {
  const { t } = useI18n("default-content-extension");
  const { item } = props;

  return (
    <div className="sb-default-content-item">
      {item.author ? (
        <div className="sb-default-content-author">
          {t("content-by-author", {
            defaultValue: "By {{author}}",
            author: item.author,
          })}
        </div>
      ) : null}
      <a
        className="sb-default-content-link"
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("content-watch-link", { defaultValue: "Watch" })}
      </a>
    </div>
  );
}

export default function initDefaultContentExtension() {
  registerExtension({
    id: "default-content-extension",
    init: (context: SeedBibleState) => {
      context.discover.registerDiscoverProvider({
        id: "default-content-extension",
        title: "Seed Bible Default Content",
        description: "Discover content selected by the Seed Bible authors.",
        discover: ({ book, chapter }) => {
          return findDiscoveredContentForChapter({ book, chapter }).map(
            ({ item, reference }): DiscoverContentResult => ({
              type: "content",
              title: item.title,
              description: item.description,
              reference,
              content: <DiscoveredContentLink item={item} />,
            })
          );
        },
      });

      return {};
    },
  });
}
