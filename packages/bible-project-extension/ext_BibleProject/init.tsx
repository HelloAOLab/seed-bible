/* eslint-disable seed-bible-i18n/i18n-untranslated-content */
import type { DiscoverResult } from "seed-bible.managers.DiscoverManager";
import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { MaterialIcon } from "seed-bible.components.icons";
import { useI18n } from "seed-bible.i18n.I18nManager";
import { z } from "zod";

const BibleProjectSchema = z.array(
  z.object({
    book: z.string(),
    book_id: z.number(),
    chapter_start: z.number(),
    chapter_end: z.number(),
    timecode: z.object({
      start: z.string(),
      start_seconds: z.number(),
      end: z.string(),
      end_seconds: z.number(),
      duration: z.string(),
    }),
    video: z.object({
      id: z.number(),
      title: z.string(),
      description: z.string(),
      duration: z.string(),
      color: z.string(),
      share_url: z.string(),
      images: z.object({
        mini: z.string(),
        small: z.string(),
        medium: z.string(),
        large: z.string(),
      }),
      paths: z.object({
        mp4: z.string(),
      }),
      category: z.object({
        id: z.number(),
        label: z.string(),
        title: z.string(),
        share_url: z.string(),
      }),
      aspect_ratio: z.number(),
    }),
    section_title: z.string(),
  })
);

const BOOK_ID_TO_USFM: Map<number, string> = new Map([
  [1, "GEN"],
  [2, "EXO"],
  [3, "LEV"],
  [4, "NUM"],
  [5, "DEU"],
  [6, "JOS"],
  [7, "JDG"],
  [8, "RUT"],
  [9, "1SA"],
  [10, "2SA"],
  [11, "1KI"],
  [12, "2KI"],
  [13, "1CH"],
  [14, "2CH"],
  [15, "EZR"],
  [16, "NEH"],
  [17, "EST"],
  [18, "JOB"],
  [19, "PSA"],
  [20, "PRO"],
  [21, "ECC"],
  [22, "SNG"],
  [23, "ISA"],
  [24, "JER"],
  [25, "LAM"],
  [26, "EZK"],
  [27, "DAN"],
  [28, "HOS"],
  [29, "JOL"],
  [30, "AMO"],
  [31, "OBA"],
  [32, "JON"],
  [33, "MIC"],
  [34, "NAM"],
  [35, "HAB"],
  [36, "ZEP"],
  [37, "HAG"],
  [38, "ZEC"],
  [39, "MAL"],
  [40, "MAT"],
  [41, "MRK"],
  [42, "LUK"],
  [43, "JHN"],
  [44, "ACT"],
  [45, "ROM"],
  [46, "1CO"],
  [47, "2CO"],
  [48, "GAL"],
  [49, "EPH"],
  [50, "PHP"],
  [51, "COL"],
  [52, "1TH"],
  [53, "2TH"],
  [54, "1TI"],
  [55, "2TI"],
  [56, "TIT"],
  [57, "PHM"],
  [58, "HEB"],
  [59, "JAS"],
  [60, "1PE"],
  [61, "2PE"],
  [62, "1JN"],
  [63, "2JN"],
  [64, "3JN"],
  [65, "JUD"],
  [66, "REV"],
]);

registerExtension({
  id: "bible-project-extension",
  init: function* (context: SeedBibleState) {
    yield context.discover.registerDiscoverProvider({
      id: "bible-project-discover-provider",
      description:
        "A discover provider that provides content from the Bible Project.",
      title: "Example Discover Provider",
      discover: async (context) => {
        const data = BibleProjectSchema.parse(
          thisBot.tags["bible-chapter-video-mapping.json"]
        );
        const content: DiscoverResult[] = [];

        for (const item of data) {
          const bookId = BOOK_ID_TO_USFM.get(item.book_id);
          if (!bookId) {
            console.warn(
              `Book ID ${item.book_id} not found in USFM mapping.`,
              item
            );
            continue;
          }

          if (bookId !== context.book) {
            continue;
          }

          if (
            item.chapter_start > context.chapter ||
            item.chapter_end < context.chapter
          ) {
            continue;
          }

          content.push({
            type: "content",
            title: item.section_title,
            description: item.video.description,
            reference: {
              book: bookId,
              chapter: item.chapter_start,
              endChapter: item.chapter_end,
            },
            content: (
              <a
                href={item.video.share_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <img
                  src={item.video.images.medium}
                  alt={item.video.title}
                  style={{ width: "100%", borderRadius: "8px" }}
                />
              </a>
            ),
          });
        }

        return content;
      },
    });

    // You can return a value to export functions or data from your extension that can be used by other extensions.
    // For example, this will export a function called "abc" that other extensions can call if they have a reference to this extension.
    return {};
  },
});
