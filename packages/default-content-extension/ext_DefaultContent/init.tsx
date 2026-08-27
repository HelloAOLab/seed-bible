import type { DiscoverContentResult } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { ExpandableText, PlaylistLinkContent } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import {
  findBibleProjectContentForChapter,
  findDiscoveredContentForChapter,
} from "./discoveredContent";

export interface DiscoveredContentBodyProps {
  description: string;
  author?: string;
  url: string;
}

export function DiscoveredContentBody(props: DiscoveredContentBodyProps) {
  const { t } = useI18n("default-content-extension");
  // "Read more"/"Read less" are already translated app-wide, so borrow those
  // instead of re-translating them into this extension's own namespace.
  const { t: tShared } = useI18n();
  const { description, author, url } = props;

  return (
    <div className="sb-default-content-item">
      {description ? (
        <ExpandableText
          className="sb-discover-item-description"
          readMoreLabel={tShared("read-more", { defaultValue: "Read more" })}
          readLessLabel={tShared("read-less", { defaultValue: "Read less" })}
        >
          {description}
        </ExpandableText>
      ) : null}
      {author ? (
        <div className="sb-default-content-author">
          {t("content-by-author", {
            defaultValue: "By {{author}}",
            author,
          })}
        </div>
      ) : null}
      <a
        className="sb-default-content-link"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        {t("content-watch-link", { defaultValue: "Watch" })}
      </a>
    </div>
  );
}

export default function initDefaultContentExtension() {
  registerExtension({
    id: "default-content-extension",
    init: function* (context: SeedBibleState) {
      yield context.discover.registerDiscoverProvider({
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
              author: item.author,
              image: item.imageUrl,
              // Every curated content link is a YouTube video (see
              // `discoveredContent.json`), so the modal can embed it directly
              // rather than reinspecting the URL to figure out what it is.
              onClick: () => {
                context.modals.openModal({
                  id: `discovered-content-${item.id}`,
                  title: item.title,
                  content: () => (
                    <PlaylistLinkContent url={item.url} title={item.title} />
                  ),
                });
              },
              content: (
                <DiscoveredContentBody
                  description={item.description}
                  author={item.author}
                  url={item.url}
                />
              ),
            })
          );
        },
      });

      // Use a different discover provider for bible project so that it can be disabled independently of the default content extension (e.g. if the user doesn't want to see it, or if the extension is disabled but the bible project data is still available).
      yield context.discover.registerDiscoverProvider({
        id: "bible-project-discover-provider",
        description: "Discover content from the Bible Project",
        title: "Bible Project",
        discover: async (discoverContext) => {
          return findBibleProjectContentForChapter(discoverContext).map(
            (item): DiscoverContentResult => ({
              type: "content",
              title: item.section_title,
              // The description renders inside `content` via ExpandableText
              // instead, so the shared wrapper's plain (un-truncated) span
              // stays empty.
              description: "",
              reference: {
                book: item.bookId,
                chapter: discoverContext.chapter,
                endChapter: item.chapter_end,
              },
              author: "Bible Project",
              image: item.video.images.medium,
              onClick: () => {
                context.modals.openModal({
                  id: `bible-project-content-${item.video.id}`,
                  title: item.section_title,
                  content: () => (
                    <PlaylistLinkContent
                      url={item.video.paths.mp4}
                      title={item.section_title}
                    />
                  ),
                });
              },
              content: (
                <DiscoveredContentBody
                  description={item.video.description}
                  url={item.video.share_url}
                />
              ),
            })
          );
        },
      });

      return {};
    },
  });
}
