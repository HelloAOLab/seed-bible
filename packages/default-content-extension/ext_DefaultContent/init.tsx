import type { DiscoverContentResult } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { PlaylistLinkContent } from "seed-bible/components";
import {
  findBibleProjectContentForChapter,
  findDiscoveredContentForChapter,
} from "./discoveredContent";

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
              description: item.description,
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
              description: item.video.description,
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
            })
          );
        },
      });

      return {};
    },
  });
}
