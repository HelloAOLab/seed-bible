import { z, type ZodSchema } from "zod";
import type { ZodStandardJSONSchemaPayload } from "zod/v4/core";
import type { PlaylistItemData } from "./PlaylistManager";
import { getBookId, type BookId } from "./BibleDataManager";

export interface AIProviderFunctionTool {
  name: string;
  type: "function";
  description: string;
  parameters: ZodStandardJSONSchemaPayload<unknown>;

  /**
   * The function that should be called by the AI provider if the AI model chooses to call this tool.
   * @param args The arguments to provide to the function.
   * @returns A promise that resolves with the result of the function call.
   */
  function: (args: unknown) => Promise<unknown>;
}

export interface AIProviderGenerateOptions {
  tools: AIProviderFunctionTool[];

  /**
   * The cancel token that can be used to abort the playlist generation request.
   */
  cancelToken: AbortSignal;
}

export const AIBibleVerseRefSchema = z.object({
  ref: z.object({
    bookId: z
      .string()
      .transform((value, ctx) => {
        const bid = getBookId(value);
        if (!bid) {
          ctx.addIssue({
            code: "custom",
            message: `Invalid book ID: ${value}. Only USFM book IDs are supported.`,
            input: value,
          });
        }
        return bid!;
      })
      .describe("The USFM book ID of the Bible verse reference."),
    chapter: z.number().positive(),
    endChapter: z.number().positive().nullable(),
    verse: z.number().positive().nullable(),
    endVerse: z.number().positive().nullable(),
  }),
});

/**
 * The shape the AI is asked to produce for a single playlist item. Kept
 * distinct from {@link PlaylistItem}: it uses nullable (not optional) fields
 * so the JSON schema handed to the provider is fully specified, and carries
 * all three item variants side-by-side so a single tool definition covers
 * every type. {@link convertToPlaylistItem} maps it back to a real
 * {@link PlaylistItemData}.
 */
export const AIPlaylistItemSchema = z.object({
  type: z.enum(["bible-verse", "link", "html"]),
  bibleVerse: AIBibleVerseRefSchema.nullable().default(null),
  link: z
    .object({
      title: z.string().nullable(),
      url: z.string(),
    })
    .nullable()
    .default(null),
  html: z
    .object({
      title: z.string().nullable(),
      html: z.string(),
    })
    .nullable()
    .default(null),
});

export const GeneratedPlaylistSchema = z.object({
  items: z.array(AIPlaylistItemSchema),
  title: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
});

export type GeneratedPlaylistItem = z.infer<typeof AIPlaylistItemSchema>;
export type GeneratedPlaylist = z.infer<typeof GeneratedPlaylistSchema>;

export function convertToPlaylistItem(
  item: GeneratedPlaylistItem
): PlaylistItemData {
  switch (item.type) {
    case "bible-verse":
      if (!item.bibleVerse) {
        throw new Error(
          'Item has type "bible-verse" but no bibleVerse was provided.'
        );
      }
      return {
        type: item.type,
        ref: {
          bookId: item.bibleVerse.ref.bookId,
          chapter: item.bibleVerse.ref.chapter,
          endChapter: item.bibleVerse.ref.endChapter ?? undefined,
          verse: item.bibleVerse.ref.verse ?? undefined,
          endVerse: item.bibleVerse.ref.endVerse ?? undefined,
        },
      };
    case "link":
      if (!item.link) {
        throw new Error('Item has type "link" but no link was provided.');
      }
      return {
        type: item.type,
        title: item.link.title ?? undefined,
        url: item.link.url,
      };
    case "html":
      if (!item.html) {
        throw new Error('Item has type "html" but no html was provided.');
      }
      return {
        type: item.type,
        title: item.html.title ?? undefined,
        html: item.html.html,
      };
  }
}

export function convertToAiPlaylistItem(
  item: PlaylistItemData
): GeneratedPlaylistItem {
  switch (item.type) {
    case "bible-verse":
      return {
        type: item.type,
        bibleVerse: {
          ref: {
            bookId: item.ref.bookId as BookId,
            chapter: item.ref.chapter,
            endChapter: item.ref.endChapter ?? null,
            verse: item.ref.verse ?? null,
            endVerse: item.ref.endVerse ?? null,
          },
        },
        link: null,
        html: null,
      };
    case "link":
      return {
        type: item.type,
        bibleVerse: null,
        link: {
          title: item.title ?? null,
          url: item.url,
        },
        html: null,
      };
    case "html":
      return {
        type: item.type,
        bibleVerse: null,
        link: null,
        html: {
          title: item.title ?? null,
          html: item.html,
        },
      };
  }
}

export function generateFunctionTool<T>(options: {
  name: string;
  description: string;
  parameters: ZodSchema<T>;
  function: (args: T) => Promise<unknown>;
}): { tool: AIProviderFunctionTool; schema: ZodSchema<T> } {
  const tool: AIProviderFunctionTool = {
    name: options.name,
    type: "function",
    description: options.description,
    parameters: options.parameters.toJSONSchema({ io: "input" }),
    function: (args: unknown) => {
      const result = options.parameters.safeParse(args);
      if (!result.success) {
        return Promise.reject(result.error);
      }
      return options.function(result.data);
    },
  };
  return {
    tool,
    schema: options.parameters,
  };
}
