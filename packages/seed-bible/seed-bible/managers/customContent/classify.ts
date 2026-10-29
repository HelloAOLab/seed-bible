import { z } from "zod";
import { scanVerseReferencesInText } from "../BibleDataManager";
import type { TranslationBook } from "../FreeUseBibleAPI";
import { parsePassages } from "./passages";
import { ContentLibraryError } from "./publish";
import type { ContentCategory, ContentItem, ContentReference } from "./schema";

/**
 * Suggesting categories and passages for an item (design doc §5.4).
 *
 * Step 1 finds the passages an item's text names outright; that's exact and
 * needs no AI. Step 2 asks a chat provider's optional `classifyContent()`
 * which of the library's categories fit and what else the content covers.
 * The prompt and the checks on the answer live here, so a provider only
 * has to get the text to its model and back, and no provider's answer is
 * trusted as given: categories are limited to the library's own, and every
 * passage is re-read by the app's own parser.
 *
 * Browser-only: the verse parser isn't part of what the import worker bundles.
 */

/** What a chat provider's `classifyContent()` is asked. */
export interface ContentClassificationRequest {
  content: {
    url: string;
    title: string;
    description: string;
    author?: string;
  };
  /** The library's categories. Only these ids may be returned. */
  categories: { id: string; name: string; description?: string }[];
  /** Passages the content's own text names, e.g. "Romans 8:28-39". */
  knownPassages: string[];
  /**
   * A ready-made system (or "developer") message explaining the task and
   * the JSON to answer with. Providers that talk to a chat model can send
   * this and {@link input} as-is and pass the reply to
   * {@link parseContentClassification}.
   */
  instructions: string;
  /** The fields above, as the user message. */
  input: string;
}

/** What `classifyContent()` answers. */
export interface ContentClassificationResult {
  /** Ids from the request's categories. */
  categoryIds: string[];
  /** Passages in common English form ("John 10:1-18"), each with a 0–1 confidence. */
  passages: { reference: string; confidence: number }[];
  /** New category names worth adding, when none of the library's fit well. */
  suggestedCategories?: string[];
}

/** Below this an AI passage is dropped. */
export const MIN_PASSAGE_CONFIDENCE = 0.5;
/** Below this a kept AI passage is flagged for the owner to check. */
export const CONFIDENT_PASSAGE = 0.75;
/** Most suggested (explicit + AI) passages per item, so a vague overview doesn't land on hundreds of chapters. */
export const MAX_SUGGESTED_PASSAGES = 10;
const MAX_CATEGORIES_PER_ITEM = 3;
const MAX_SUGGESTED_CATEGORIES = 5;

const INSTRUCTIONS = [
  "You help a church or ministry file its content (videos, sermons, articles, podcasts) in a Bible app, so readers find it next to the passages it teaches.",
  "You'll get one piece of content as JSON: its url, title, description and author, the library's categories (id, name, description), and knownPassages that its text names outright.",
  "Answer with ONLY a JSON object, no prose and no code fences:",
  '{"categoryIds": ["…"], "passages": [{"reference": "John 10:1-18", "confidence": 0.9}], "suggestedCategories": ["…"]}',
  "Rules:",
  "- categoryIds: up to 3 ids, only from the given categories, for the categories the content clearly belongs in. An empty array if none fit.",
  "- passages: the Bible passages the content is about or teaches from, not every passing mention. Include the knownPassages that are relevant. Use common English book names, chapter, and verses where you can tell them. At most 10.",
  "- confidence: 0 to 1, how sure you are the content covers that passage. Use 0.9 or more only when the content says so or it's unmistakable.",
  "- suggestedCategories: up to 3 short new category names, only if none of the given categories fit well. Usually an empty array.",
  "- If you can't tell, return empty arrays rather than guessing.",
].join("\n");

export function buildClassificationRequest(
  item: Pick<ContentItem, "url" | "title" | "description" | "author">,
  categories: readonly ContentCategory[],
  knownPassages: readonly string[]
): ContentClassificationRequest {
  const content = {
    url: item.url,
    title: item.title,
    description: item.description,
    ...(item.author ? { author: item.author } : {}),
  };
  const categoryList = categories.map((category) => ({
    id: category.id,
    name: category.name,
    ...(category.description ? { description: category.description } : {}),
  }));
  return {
    content,
    categories: categoryList,
    knownPassages: [...knownPassages],
    instructions: INSTRUCTIONS,
    input: JSON.stringify({
      ...content,
      categories: categoryList,
      knownPassages,
    }),
  };
}

const passageSchema = z.union([
  z.object({
    reference: z.string(),
    confidence: z.number().optional(),
  }),
  // Some models answer with bare strings.
  z.string().transform((reference) => ({ reference, confidence: undefined })),
]);

const resultSchema = z.object({
  categoryIds: z.array(z.string()).catch([]).default([]),
  passages: z.array(passageSchema).catch([]).default([]),
  suggestedCategories: z.array(z.string()).catch([]).optional(),
});

/**
 * Reads a model's reply into a {@link ContentClassificationResult},
 * tolerating code fences or prose around the JSON. Throws a
 * `ContentLibraryError` ("invalid_classification") when there's no JSON
 * object to read.
 */
export function parseContentClassification(
  text: string
): ContentClassificationResult {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  let json: unknown;
  try {
    json = JSON.parse(
      start >= 0 && end > start ? text.slice(start, end + 1) : text
    );
  } catch {
    throw new ContentLibraryError(
      "invalid_classification",
      "The AI's answer wasn't JSON."
    );
  }
  const parsed = resultSchema.safeParse(json);
  if (!parsed.success) {
    throw new ContentLibraryError(
      "invalid_classification",
      "The AI's answer wasn't in the expected shape."
    );
  }
  return {
    categoryIds: parsed.data.categoryIds,
    passages: parsed.data.passages.map((p) => ({
      reference: p.reference,
      // A passage given without a confidence is treated as fairly sure, not certain.
      confidence: p.confidence ?? 0.8,
    })),
    ...(parsed.data.suggestedCategories
      ? { suggestedCategories: parsed.data.suggestedCategories }
      : {}),
  };
}

function referenceKey(reference: ContentReference): string {
  return [
    reference.book,
    reference.chapter,
    reference.endChapter ?? "",
    reference.verse ?? "",
    reference.endVerse ?? "",
  ].join("|");
}

/** Step 1: the passages an item's title and description name outright. */
export function findExplicitReferences(
  item: Pick<ContentItem, "title" | "description">,
  books?: TranslationBook[]
): ContentReference[] {
  const found = new Map<string, ContentReference>();
  for (const match of scanVerseReferencesInText(
    `${item.title}\n${item.description}`,
    books
  )) {
    const reference: ContentReference = {
      book: match.ref.book,
      chapter: match.ref.chapter,
      ...(match.ref.endChapter !== undefined
        ? { endChapter: match.ref.endChapter }
        : {}),
      ...(match.ref.verse !== undefined ? { verse: match.ref.verse } : {}),
      ...(match.ref.endVerse !== undefined
        ? { endVerse: match.ref.endVerse }
        : {}),
      source: "explicit",
      confidence: 1,
    };
    found.set(referenceKey(reference), reference);
  }
  return [...found.values()];
}

/**
 * Applies a classification to an item, keeping what the owner decided:
 *
 * - Passages the owner entered are never replaced. Earlier suggestions
 *   (explicit and AI) are replaced by this round's.
 * - Explicit passages always beat an AI duplicate.
 * - AI passages must parse and exist; below {@link MIN_PASSAGE_CONFIDENCE}
 *   they're dropped. Suggestions are capped at {@link MAX_SUGGESTED_PASSAGES},
 *   most confident first.
 * - Categories the owner already gave (a CSV, an edit) stay. Otherwise the
 *   AI's are used, limited to the library's own.
 * - New category ideas are kept on the item for the owner to add or ignore.
 *
 * `result` is absent when only step 1 ran (no provider configured), and
 * `error` is set when the provider failed; either way step 1's passages apply.
 */
export function applyClassification(
  item: ContentItem,
  options: {
    explicit: readonly ContentReference[];
    result?: ContentClassificationResult;
    error?: string;
    providerId?: string;
    categories: readonly ContentCategory[];
    books?: TranslationBook[];
    now: number;
  }
): ContentItem {
  const owner = item.references.filter((r) => r.source === "owner");
  const taken = new Set(owner.map(referenceKey));

  const suggested: ContentReference[] = [];
  for (const reference of options.explicit) {
    if (!taken.has(referenceKey(reference))) {
      taken.add(referenceKey(reference));
      suggested.push(reference);
    }
  }

  const fromAi: ContentReference[] = [];
  for (const passage of options.result?.passages ?? []) {
    const confidence = Math.min(Math.max(passage.confidence, 0), 1);
    if (confidence < MIN_PASSAGE_CONFIDENCE) {
      continue;
    }
    const [parsed] = parsePassages(passage.reference, options.books).references;
    if (!parsed) {
      continue;
    }
    const reference: ContentReference = { ...parsed, source: "ai", confidence };
    if (!taken.has(referenceKey(reference))) {
      taken.add(referenceKey(reference));
      fromAi.push(reference);
    }
  }
  fromAi.sort((a, b) => b.confidence - a.confidence);
  suggested.push(...fromAi);

  const known = new Map(options.categories.map((c) => [c.id, c]));
  const categoryIds =
    item.categoryIds.length > 0
      ? item.categoryIds
      : [...new Set(options.result?.categoryIds ?? [])]
          .filter((id) => known.has(id))
          .slice(0, MAX_CATEGORIES_PER_ITEM);

  const existingNames = new Set(
    options.categories.map((c) => c.name.trim().toLowerCase())
  );
  const suggestedCategories = [
    ...new Set(
      (options.result?.suggestedCategories ?? [])
        .map((name) => name.trim().slice(0, 100))
        .filter((name) => name && !existingNames.has(name.toLowerCase()))
    ),
  ].slice(0, MAX_SUGGESTED_CATEGORIES);

  return {
    ...item,
    categoryIds,
    references: [...owner, ...suggested.slice(0, MAX_SUGGESTED_PASSAGES)],
    classification: {
      status: options.error ? "failed" : "done",
      ...(options.providerId ? { providerId: options.providerId } : {}),
      ...(suggestedCategories.length ? { suggestedCategories } : {}),
      ...(options.error ? { error: options.error.slice(0, 500) } : {}),
      at: options.now,
    },
    updatedAt: options.now,
  };
}

/**
 * Whether an item can be published without review: it has passages, and
 * every one is the owner's, named in its text, or a confident suggestion.
 */
export function isConfidentlyClassified(item: ContentItem): boolean {
  return (
    item.references.length > 0 &&
    item.references.every(
      (r) => r.source !== "ai" || r.confidence >= CONFIDENT_PASSAGE
    )
  );
}
