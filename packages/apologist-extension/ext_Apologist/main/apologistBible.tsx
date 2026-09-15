import type { SeedBibleState } from "seed-bible";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

/**
 * Default / last-resort Apologist `metadata.bible` code (docs: BSB).
 * Also the retry target when an agent rejects a code we thought was supported.
 */
export const APOLOGIST_DEFAULT_BIBLE = "bsb";

/**
 * Canonical Apologist bible codes from the Fusion docs' common English list.
 * Agent catalogs can still differ — {@link postApologistChatCompletion} retries
 * with {@link APOLOGIST_DEFAULT_BIBLE} when the API rejects a code.
 *
 * Single source of truth: the supported set is this list; do not maintain a
 * parallel allow-list of the same strings.
 */
export const APOLOGIST_CANONICAL_BIBLES = [
  "bsb",
  "webu",
  "net",
  "oeb",
  "drb",
  "esv",
  "niv",
  "kjv",
  "nkjv",
  "nlt",
  "csb",
  "nasb1995",
  "nasb",
  "lsb",
  "tlv",
  "cjb",
] as const;

export type ApologistCanonicalBible =
  (typeof APOLOGIST_CANONICAL_BIBLES)[number];

/** Derived allow-list — keep consumers off a second hardcoded table. */
export const APOLOGIST_SUPPORTED_BIBLES: ReadonlySet<string> = new Set(
  APOLOGIST_CANONICAL_BIBLES
);

/**
 * Seed shortNames / bare ids that do **not** lower-case onto a canonical code.
 * Everything else (KJV→kjv, BSB→bsb, ESV→esv, …) is handled by lowercasing
 * against {@link APOLOGIST_CANONICAL_BIBLES} — do not duplicate those here.
 */
const APOLOGIST_BIBLE_ALIASES: Record<string, ApologistCanonicalBible> = {
  WEB: "webu",
  KJAV: "kjv",
  NASB95: "nasb1995",
};

export type SeedTranslationRef = Pick<
  Translation,
  "id" | "shortName" | "language"
> &
  Partial<Pick<Translation, "name" | "englishName">>;

export interface ApologistBibleResolution {
  /** Code to send as `metadata.bible`. */
  code: string;
  /** True when the Seed translation is not directly supported. */
  usedFallback: boolean;
}

/**
 * Tries to map a single candidate string (shortName, id, or stripped id) to an
 * Apologist bible code. Returns null when unsupported.
 */
export function mapCandidateToApologistBible(
  candidate: string | null | undefined
): string | null {
  if (!candidate) {
    return null;
  }
  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }

  const alias = APOLOGIST_BIBLE_ALIASES[trimmed.toUpperCase()];
  if (alias) {
    return alias;
  }

  const lower = trimmed.toLowerCase();
  if (APOLOGIST_SUPPORTED_BIBLES.has(lower)) {
    return lower;
  }

  return null;
}

/**
 * Candidate strings for a Seed translation, in preference order:
 * shortName → raw id → id with leading `xx_` / `xxx_` language prefix stripped.
 */
export function seedTranslationCandidates(
  translation: SeedTranslationRef | null | undefined
): string[] {
  if (!translation) {
    return [];
  }

  const candidates: string[] = [];
  const push = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (trimmed && !candidates.includes(trimmed)) {
      candidates.push(trimmed);
    }
  };

  push(translation.shortName);
  push(translation.id);
  if (translation.id) {
    const stripped = translation.id.replace(/^[a-z]{2,3}_/i, "");
    push(stripped);
  }

  return candidates;
}

/**
 * Maps a Seed translation to an Apologist code without considering catalog
 * fallbacks. Returns null when none of its candidates are supported.
 */
export function mapSeedTranslationToApologistBible(
  translation: SeedTranslationRef | null | undefined
): string | null {
  for (const candidate of seedTranslationCandidates(translation)) {
    const mapped = mapCandidateToApologistBible(candidate);
    if (mapped) {
      return mapped;
    }
  }
  return null;
}

/**
 * Resolves a Seed Bible translation to an Apologist `metadata.bible` code.
 *
 * Prefer shortName, then raw id, then a language-prefix-stripped id. When
 * none of those map onto {@link APOLOGIST_CANONICAL_BIBLES}, fall back to
 * {@link APOLOGIST_DEFAULT_BIBLE}.
 */
export function resolveApologistBible(
  translation: SeedTranslationRef | null | undefined
): ApologistBibleResolution {
  const direct = mapSeedTranslationToApologistBible(translation);
  if (direct) {
    return { code: direct, usedFallback: false };
  }
  return { code: APOLOGIST_DEFAULT_BIBLE, usedFallback: true };
}

/**
 * True when a failed chat-completions response looks like the agent rejected
 * `metadata.bible` (catalogs are per-agent; our canonical list can be wrong).
 */
export function isLikelyUnsupportedApologistBibleError(
  status: number,
  body: string
): boolean {
  if (status !== 400 && status !== 422) {
    return false;
  }
  const lower = body.toLowerCase();
  return (
    lower.includes("bible") ||
    lower.includes("translation") ||
    lower.includes("metadata")
  );
}

export interface ApologistChatCompletionRequest {
  url: string;
  headers?: HeadersInit;
  model: string;
  stream: boolean;
  language: string;
  /** Initial `metadata.bible` from {@link resolveApologistBible}. */
  bible: string;
  messages: unknown;
  tools?: unknown;
}

export interface ApologistChatCompletionResult {
  response: Response;
  /** Code actually accepted for this attempt (may be the default after retry). */
  bible: string;
  /** True when the first code was rejected and we retried with the default. */
  retriedWithDefault: boolean;
}

/**
 * POSTs chat/completions with `metadata.bible`. If the agent rejects that
 * bible (and we weren't already on the default), retries once with
 * {@link APOLOGIST_DEFAULT_BIBLE}. Keeps mapping + reject-fallback in one place.
 */
export async function postApologistChatCompletion(
  request: ApologistChatCompletionRequest
): Promise<ApologistChatCompletionResult> {
  const post = (bible: string) =>
    fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({
        model: request.model,
        stream: request.stream,
        metadata: {
          bible,
          language: request.language,
        },
        messages: request.messages,
        tools: request.tools,
      }),
    });

  const firstBible = request.bible || APOLOGIST_DEFAULT_BIBLE;
  const first = await post(firstBible);
  if (first.ok || firstBible === APOLOGIST_DEFAULT_BIBLE) {
    return {
      response: first,
      bible: firstBible,
      retriedWithDefault: false,
    };
  }

  const errorBody = await first.text().catch(() => "");
  if (!isLikelyUnsupportedApologistBibleError(first.status, errorBody)) {
    return {
      response: new Response(errorBody, {
        status: first.status,
        statusText: first.statusText,
        headers: first.headers,
      }),
      bible: firstBible,
      retriedWithDefault: false,
    };
  }

  const retry = await post(APOLOGIST_DEFAULT_BIBLE);
  return {
    response: retry,
    bible: APOLOGIST_DEFAULT_BIBLE,
    retriedWithDefault: true,
  };
}

/**
 * Looks up the Seed translation of the active reader tab for AI chat.
 */
export function getEffectiveSeedTranslationForAi(
  context: SeedBibleState
): SeedTranslationRef | null {
  const tab = context.app.selectedTab.value;
  const tabTranslation = tab?.readingState.translation.value;
  if (tabTranslation) {
    return tabTranslation;
  }

  const tabTranslationId = tab?.readingState.translationId.value ?? null;
  if (!tabTranslationId) {
    return null;
  }

  const fromCatalog = context.bibleData.availableTranslations.value.find(
    (t) => t.id === tabTranslationId
  );
  if (fromCatalog) {
    return fromCatalog;
  }

  return {
    id: tabTranslationId,
    shortName: tabTranslationId,
    language: "eng",
    name: tabTranslationId,
  };
}

/**
 * Full UI locale for Apologist `metadata.language` / instructions: underscores
 * become hyphens so BCP-47 forms like `zh-TW` and `pt-BR` stay intact.
 */
export function uiLocaleForApologist(language: string): string {
  return language.replace(/_/g, "-");
}
