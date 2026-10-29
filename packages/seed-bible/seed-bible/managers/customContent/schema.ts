import { z } from "zod";

/**
 * A content library lives in its own CasualOS record, one per Customization,
 * so these addresses are relative to that record rather than prefixed.
 * See `docs/custom-content-database.md` §4.
 */
export const CONTENT_MANIFEST_ADDRESS = "manifest";
/**
 * Published item counts per chapter. Separate from the manifest so the
 * publisher and the editor never write the same entry: the editor owns the
 * manifest's settings, publishing owns these counts.
 */
export const CONTENT_CHAPTER_INDEX_ADDRESS = "chapters";

export const CONTENT_LIBRARY_MARKER = "publicRead:seedBibleContentLibrary";
/**
 * Where the import worker reports on the library's latest import. It also
 * proves the worker can write to the record before it queues anything.
 */
export const CONTENT_IMPORT_STATUS_ADDRESS = "importStatus";
export const CONTENT_IMPORT_STATUS_MARKER = "seedBibleContentImport";
/** Items hold review state and owner notes, so only the owner reads them. */
export const CONTENT_ITEM_MARKER = "seedBibleContentItem";
export const CONTENT_CHAPTER_MARKER = "publicRead:seedBibleContentChapter";

export function contentItemAddress(itemId: string): string {
  return `item.${itemId}`;
}

/** `"JHN.3"`: how chapters are keyed in the manifest and in chapter addresses. */
export function contentChapterKey(book: string, chapter: number): string {
  return `${book}.${chapter}`;
}

export function contentChapterAddress(book: string, chapter: number): string {
  return `ch.${contentChapterKey(book, chapter)}`;
}

export function parseContentChapterKey(
  key: string
): { book: string; chapter: number } | null {
  const dot = key.lastIndexOf(".");
  const chapter = Number(key.slice(dot + 1));
  if (dot <= 0 || !Number.isInteger(chapter) || chapter < 1) {
    return null;
  }
  return { book: key.slice(0, dot), chapter };
}

// Caps keep one oversized item from bloating every chapter record it lands in.
export const MAX_CONTENT_TITLE_LENGTH = 300;
export const MAX_CONTENT_DESCRIPTION_LENGTH = 2000;
export const MAX_CONTENT_URL_LENGTH = 2048;

export const contentCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  hiddenByDefault: z.boolean().optional(),
  priority: z.number().optional(),
});

export type ContentCategory = z.infer<typeof contentCategorySchema>;

export const contentLibraryManifestSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(200),
  /** The Customization this library was created for, as its `recordName.id` locator. */
  customizationLocator: z.string().min(1),
  /** Author given to new items, since link previews don't include one. */
  defaultAuthor: z.string().max(200).optional(),
  categories: z.array(contentCategorySchema),
  /**
   * The chat provider (by id) whose `classifyContent()` suggests categories
   * and passages for imported items. Absent: only passages the content
   * names outright are found.
   */
  classifierProviderId: z.string().min(1).max(200).optional(),
  /** Publish imported items without review when every suggested passage is confident. */
  autoPublish: z.boolean().optional(),
  updatedAt: z.number(),
});

export type ContentLibraryManifest = z.infer<
  typeof contentLibraryManifestSchema
>;

export const contentChapterIndexSchema = z.object({
  schemaVersion: z.literal(1),
  /**
   * Published item count per chapter key (`"JHN.3"`). Chapters with no
   * content are absent, which lets Discover skip the network for them.
   */
  chapters: z.record(z.string(), z.number().int().nonnegative()),
  updatedAt: z.number(),
});

export type ContentChapterIndex = z.infer<typeof contentChapterIndexSchema>;

export const CONTENT_REFERENCE_SOURCES = ["explicit", "ai", "owner"] as const;

export const contentReferenceSchema = z.object({
  book: z.string().min(1),
  chapter: z.number().int().positive(),
  endChapter: z.number().int().positive().optional(),
  /** Absent means the whole chapter. */
  verse: z.number().int().positive().optional(),
  endVerse: z.number().int().positive().optional(),
  /** Owner-entered references are never replaced by a later re-classify. */
  source: z.enum(CONTENT_REFERENCE_SOURCES),
  confidence: z.number().min(0).max(1),
});

export type ContentReference = z.infer<typeof contentReferenceSchema>;

/**
 * `draft` is an item the owner hasn't published. The others belong to
 * automatic imports: `pending` while it's being fetched and classified,
 * `needs_review` once suggestions are ready, `failed` when that didn't work.
 */
export const CONTENT_ITEM_STATUSES = [
  "draft",
  "pending",
  "needs_review",
  "published",
  "failed",
] as const;

export type ContentItemStatus = (typeof CONTENT_ITEM_STATUSES)[number];

export const contentItemSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1).max(MAX_CONTENT_URL_LENGTH),
  status: z.enum(CONTENT_ITEM_STATUSES),
  title: z.string().max(MAX_CONTENT_TITLE_LENGTH),
  description: z.string().max(MAX_CONTENT_DESCRIPTION_LENGTH),
  image: z.string().max(MAX_CONTENT_URL_LENGTH).optional(),
  author: z.string().max(200).optional(),
  /** The first is the primary category: it decides the item's Discover section. */
  categoryIds: z.array(z.string()),
  references: z.array(contentReferenceSchema),
  error: z.string().optional(),
  /**
   * The last time categories and passages were suggested for the item.
   * Absent: not yet. `providerId` absent: only step 1 ran (passages its text
   * names), because the library had no AI configured.
   */
  classification: z
    .object({
      status: z.enum(["done", "failed"]),
      providerId: z.string().optional(),
      /** New category names the AI thought would fit, for the owner to add or ignore. */
      suggestedCategories: z.array(z.string().max(100)).max(10).optional(),
      error: z.string().max(500).optional(),
      at: z.number(),
    })
    .optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type ContentItem = z.infer<typeof contentItemSchema>;

export const CONTENT_MEDIA_KINDS = ["embed", "video", "link"] as const;

export const contentChapterEntrySchema = z.object({
  itemId: z.string().min(1),
  url: z.string().min(1),
  mediaKind: z.enum(CONTENT_MEDIA_KINDS),
  title: z.string(),
  description: z.string(),
  image: z.string().optional(),
  author: z.string().optional(),
  categoryIds: z.array(z.string()),
  /** The verses of this chapter the item covers. Empty means the whole chapter. */
  verses: z.array(z.number().int().positive()),
  /** Clipped to this chapter: Discover drops results whose reference is another chapter. */
  reference: z.object({
    book: z.string(),
    chapter: z.number().int().positive(),
    verse: z.number().int().positive().optional(),
    endVerse: z.number().int().positive().optional(),
  }),
});

export type ContentChapterEntry = z.infer<typeof contentChapterEntrySchema>;

export const contentChapterRecordSchema = z.object({
  schemaVersion: z.literal(1),
  book: z.string(),
  chapter: z.number().int().positive(),
  updatedAt: z.number(),
  entries: z.array(contentChapterEntrySchema),
});

export type ContentChapterRecord = z.infer<typeof contentChapterRecordSchema>;
