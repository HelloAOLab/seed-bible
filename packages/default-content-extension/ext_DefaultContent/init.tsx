import type { DiscoverContentResult } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { ExpandableText } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import {
  findDiscoveredContentForChapter,
  type DiscoveredContentItem,
} from "./discoveredContent";

function DiscoveredContentBody(props: { item: DiscoveredContentItem }) {
  const { t } = useI18n("default-content-extension");
  // "Read more"/"Read less" are already translated app-wide, so borrow those
  // instead of re-translating them into this extension's own namespace.
  const { t: tShared } = useI18n();
  const { item } = props;

  return (
    <div className="sb-default-content-item">
      {item.description ? (
        <ExpandableText
          className="sb-discover-item-description"
          readMoreLabel={tShared("read-more", { defaultValue: "Read more" })}
          readLessLabel={tShared("read-less", { defaultValue: "Read less" })}
        >
          {item.description}
        </ExpandableText>
      ) : null}
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
              // The description renders inside `content` via ExpandableText
              // instead, so the shared wrapper's plain (un-truncated) span
              // stays empty.
              description: "",
              reference,
              content: <DiscoveredContentBody item={item} />,
            })
          );
        },
      });

      return {};
    },
  });
}
