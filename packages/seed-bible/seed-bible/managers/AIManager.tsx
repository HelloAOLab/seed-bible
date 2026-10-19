import { z, type ZodSchema } from "zod";
import type { ZodStandardJSONSchemaPayload } from "zod/v4/core";
import type { PlaylistItemData } from "./PlaylistManager";
import { getBookId, type BookId } from "./BibleDataManager";

/**
 * Which chat and which AI invoked a tool. Core tools are shared by every
 * chat, so a tool that posts into a conversation has to be told which one
 * called it instead of guessing from the chat the user has selected.
 */
export interface AIToolCallContext {
  chatId?: string;
  providerId?: string;
}

export interface AIProviderFunctionTool {
  name: string;
  type: "function";
  description: string;
  parameters: ZodStandardJSONSchemaPayload<unknown>;

  /**
   * The function that should be called by the AI provider if the AI model chooses to call this tool.
   * @param args The arguments to provide to the function.
   * @param context The chat and provider that invoked the tool, when the caller knows them.
   * @returns A promise that resolves with the result of the function call.
   */
  function: (args: unknown, context?: AIToolCallContext) => Promise<unknown>;
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
  type: z.enum(["bible-verse", "link", "html", "question", "compare", "scene"]),
  bibleVerse: AIBibleVerseRefSchema.extend({
    /** The author's note on the passage, as HTML, and its optional title. */
    note: z.string().nullable().default(null),
    noteTitle: z.string().nullable().default(null),
    /** Further passages read after `ref` as part of the same step. */
    refs: z.array(AIBibleVerseRefSchema.shape.ref).nullable().default(null),
  })
    .nullable()
    .default(null),
  question: z
    .object({
      title: z.string().nullable(),
      /** What readers are asked. */
      prompt: z.string(),
      /** Whether readers in a group session may share their answers. */
      shareable: z.boolean().nullable().default(null),
    })
    .nullable()
    .default(null),
  compare: z
    .object({
      title: z.string().nullable(),
      /** Two or more passages to show side by side. */
      refs: z.array(AIBibleVerseRefSchema.shape.ref).min(2),
      /** A line above the passages saying what to look for. */
      description: z.string().nullable(),
    })
    .nullable()
    .default(null),
  /** A heading over the steps that follow it, up to the next scene. */
  scene: z.object({ title: z.string() }).nullable().default(null),
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
        note: item.bibleVerse.note ?? undefined,
        noteTitle: item.bibleVerse.noteTitle ?? undefined,
        refs: item.bibleVerse.refs?.length
          ? item.bibleVerse.refs.map((ref) => ({
              bookId: ref.bookId,
              chapter: ref.chapter,
              endChapter: ref.endChapter ?? undefined,
              verse: ref.verse ?? undefined,
              endVerse: ref.endVerse ?? undefined,
            }))
          : undefined,
      };
    case "question":
      if (!item.question) {
        throw new Error(
          'Item has type "question" but no question was provided.'
        );
      }
      return {
        type: item.type,
        title: item.question.title ?? undefined,
        prompt: item.question.prompt,
        shareable: item.question.shareable ?? undefined,
      };
    case "compare":
      if (!item.compare) {
        throw new Error('Item has type "compare" but no compare was provided.');
      }
      return {
        type: item.type,
        title: item.compare.title ?? undefined,
        refs: item.compare.refs.map((ref) => ({
          bookId: ref.bookId,
          chapter: ref.chapter,
          endChapter: ref.endChapter ?? undefined,
          verse: ref.verse ?? undefined,
          endVerse: ref.endVerse ?? undefined,
        })),
        description: item.compare.description ?? undefined,
      };
    case "scene":
      if (!item.scene) {
        throw new Error('Item has type "scene" but no scene was provided.');
      }
      return { type: item.type, title: item.scene.title };
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
        ...EMPTY_AI_ITEM,
        type: item.type,
        bibleVerse: {
          ref: {
            bookId: item.ref.bookId as BookId,
            chapter: item.ref.chapter,
            endChapter: item.ref.endChapter ?? null,
            verse: item.ref.verse ?? null,
            endVerse: item.ref.endVerse ?? null,
          },
          note: item.note ?? null,
          noteTitle: item.noteTitle ?? null,
          refs: item.refs?.length
            ? item.refs.map((ref) => ({
                bookId: ref.bookId as BookId,
                chapter: ref.chapter,
                endChapter: ref.endChapter ?? null,
                verse: ref.verse ?? null,
                endVerse: ref.endVerse ?? null,
              }))
            : null,
        },
      };
    case "link":
      return {
        ...EMPTY_AI_ITEM,
        type: item.type,
        link: {
          title: item.title ?? null,
          url: item.url,
        },
      };
    case "html":
      return {
        ...EMPTY_AI_ITEM,
        type: item.type,
        html: {
          title: item.title ?? null,
          html: item.html,
        },
      };
    case "question":
      return {
        ...EMPTY_AI_ITEM,
        type: item.type,
        question: {
          title: item.title ?? null,
          prompt: item.prompt,
          shareable: item.shareable ?? null,
        },
      };
    case "compare":
      return {
        ...EMPTY_AI_ITEM,
        type: item.type,
        compare: {
          title: item.title ?? null,
          refs: item.refs.map((ref) => ({
            bookId: ref.bookId as BookId,
            chapter: ref.chapter,
            endChapter: ref.endChapter ?? null,
            verse: ref.verse ?? null,
            endVerse: ref.endVerse ?? null,
          })),
          description: item.description ?? null,
        },
      };
    case "scene":
      return {
        ...EMPTY_AI_ITEM,
        type: item.type,
        scene: { title: item.title },
      };
  }
}

/** Every per-type payload absent; a conversion fills in the one it needs. */
const EMPTY_AI_ITEM = {
  bibleVerse: null,
  link: null,
  html: null,
  question: null,
  compare: null,
  scene: null,
} as const;

export function generateFunctionTool<T>(options: {
  name: string;
  description: string;
  parameters: ZodSchema<T>;
  function: (args: T, context?: AIToolCallContext) => Promise<unknown>;
}): { tool: AIProviderFunctionTool; schema: ZodSchema<T> } {
  const tool: AIProviderFunctionTool = {
    name: options.name,
    type: "function",
    description: options.description,
    parameters: options.parameters.toJSONSchema({ io: "input" }),
    function: (args: unknown, context?: AIToolCallContext) => {
      const result = options.parameters.safeParse(args);
      if (!result.success) {
        return Promise.reject(result.error);
      }
      return options.function(result.data, context);
    },
  };
  return {
    tool,
    schema: options.parameters,
  };
}
