import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { effect } from "@preact/signals";

/**
 * Removable AI-bible fallback warning gate.
 *
 * Set to `false` (or delete {@link shouldWarnApologistBibleFallback} call sites
 * in `init.tsx`) to stop showing the unsupported-translation modal.
 */
export const SHOW_APOLOGIST_BIBLE_FALLBACK_WARNING = true;

/** Apologist's documented default when no bible preference is set. */
export const APOLOGIST_DEFAULT_BIBLE = "bsb";

export const FALLBACK_DISMISS_STORAGE_KEY =
  "sb-apologist-bible-fallback-dismissed";

export const APOLOGIST_BIBLE_FALLBACK_MODAL_ID =
  "apologist-bible-fallback-warning";

/**
 * Common English codes from Apologist's chat-completion docs. Agent-specific
 * catalogs can differ; keep this list aligned with what Seed's Apologist
 * agent actually exposes. Prefer verifying against the live agent when that
 * surface is available rather than treating this as authoritative forever.
 *
 * @see https://apologistproject.org/documentation/apologist-fusion/chat-completion#6-toc-title
 */
export const APOLOGIST_SUPPORTED_BIBLES = new Set([
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
]);

/**
 * Seed shortNames / bare codes → Apologist `metadata.bible` codes.
 * Keys are matched case-insensitively. Prefer shortName over raw `id` —
 * Free Use API ids vary by source (`BSB` vs `eng_kjv`) while shortName is the
 * stable abbreviation (see compareState / sitemap).
 */
export const SEED_TO_APOLOGIST_BIBLE: Readonly<Record<string, string>> = {
  BSB: "bsb",
  KJAV: "kjv",
  KJV: "kjv",
  WEB: "webu",
  WEBU: "webu",
  NET: "net",
  OEB: "oeb",
  DRB: "drb",
  ESV: "esv",
  NIV: "niv",
  NKJV: "nkjv",
  NLT: "nlt",
  CSB: "csb",
  NASB: "nasb",
  /** Catalog shortName for NASB 1995 (compareState curated list). */
  NASB95: "nasb1995",
  NASB1995: "nasb1995",
  LSB: "lsb",
  TLV: "tlv",
  CJB: "cjb",
};

export type ApologistBibleResolution = {
  /** Value to send as `metadata.bible`. */
  bible: string;
  /** Seed translation id that was requested (if any). */
  requestedSeedId: string | null;
  /** True when `bible` is not a direct mapping of `requestedSeedId`. */
  usedFallback: boolean;
  /** Human-readable reason for logging / modal copy. */
  reason: "mapped" | "nearest-same-language" | "default-english";
};

const warnedPairs = new Set<string>();

function normalizeSeedId(seedId: string | null | undefined): string | null {
  if (!seedId) {
    return null;
  }
  const trimmed = seedId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Strips a leading ISO-ish language prefix from Free Use ids (`eng_kjv` →
 * `kjv`, `spa_rv` → `rv`). Leaves bare codes and other shapes unchanged.
 */
export function stripLanguagePrefixFromTranslationId(id: string): string {
  return id.replace(/^[a-z]{2,3}_/i, "");
}

function tryMapToken(token: string): string | null {
  const mapped =
    SEED_TO_APOLOGIST_BIBLE[token] ??
    SEED_TO_APOLOGIST_BIBLE[token.toUpperCase()];
  if (mapped && APOLOGIST_SUPPORTED_BIBLES.has(mapped)) {
    return mapped;
  }

  const asCode = token.toLowerCase();
  if (APOLOGIST_SUPPORTED_BIBLES.has(asCode)) {
    return asCode;
  }

  return null;
}

/**
 * Candidate tokens for a Seed translation, in preference order:
 * shortName (stable abbreviation) → raw id → id with `lang_` prefix stripped.
 */
function* mappingCandidates(
  seedId: string | null | undefined,
  shortName?: string | null
): Generator<string> {
  const seen = new Set<string>();
  const yieldUnique = function* (value: string | null | undefined) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) {
      return;
    }
    seen.add(trimmed.toLowerCase());
    yield trimmed;
  };

  yield* yieldUnique(shortName);

  const normalizedId = normalizeSeedId(seedId);
  if (!normalizedId) {
    return;
  }

  yield* yieldUnique(normalizedId);

  const stripped = stripLanguagePrefixFromTranslationId(normalizedId);
  if (stripped !== normalizedId) {
    yield* yieldUnique(stripped);
  }
}

/**
 * Maps a Seed translation to an Apologist bible code when we know it is
 * supported. Prefer passing `shortName` from the catalog; `id` alone still
 * works for bare codes (`BSB`) and prefixed forms (`eng_kjv`).
 */
export function mapSeedTranslationToApologist(
  seedId: string | null | undefined,
  shortName?: string | null
): string | null {
  for (const candidate of mappingCandidates(seedId, shortName)) {
    const mapped = tryMapToken(candidate);
    if (mapped) {
      return mapped;
    }
  }
  return null;
}

function findNearestSupportedInLanguage(
  language: string,
  catalog: readonly Translation[] | null | undefined
): string | null {
  if (!catalog?.length || !language) {
    return null;
  }

  const lang = language.toLowerCase();
  for (const translation of catalog) {
    if (translation.language.toLowerCase() !== lang) {
      continue;
    }
    const mapped = mapSeedTranslationToApologist(
      translation.id,
      translation.shortName
    );
    if (mapped) {
      return mapped;
    }
  }

  return null;
}

/**
 * Resolves which Apologist `metadata.bible` value to send for a Seed
 * translation preference.
 *
 * Preference order for the *Seed* id is owned by the caller (AI override →
 * active tab). This function only maps / falls back for Apologist support:
 * 1. Direct mapping via shortName / id / stripped id when supported
 * 2. Another catalog translation in the same Bible language that maps
 * 3. English default (`bsb`)
 */
export function resolveApologistBible(options: {
  seedTranslationId: string | null | undefined;
  catalog?: readonly Translation[] | null;
}): ApologistBibleResolution {
  const requestedSeedId = normalizeSeedId(options.seedTranslationId);

  if (!requestedSeedId) {
    return {
      bible: APOLOGIST_DEFAULT_BIBLE,
      requestedSeedId: null,
      usedFallback: true,
      reason: "default-english",
    };
  }

  const requested = options.catalog?.find(
    (t) => t.id.toLowerCase() === requestedSeedId.toLowerCase()
  );

  const direct = mapSeedTranslationToApologist(
    requestedSeedId,
    requested?.shortName
  );
  if (direct) {
    return {
      bible: direct,
      requestedSeedId,
      usedFallback: false,
      reason: "mapped",
    };
  }

  if (requested) {
    const nearest = findNearestSupportedInLanguage(
      requested.language,
      options.catalog
    );
    if (nearest) {
      return {
        bible: nearest,
        requestedSeedId,
        usedFallback: true,
        reason: "nearest-same-language",
      };
    }
  }

  return {
    bible: APOLOGIST_DEFAULT_BIBLE,
    requestedSeedId,
    usedFallback: true,
    reason: "default-english",
  };
}

export function isApologistBibleFallbackDismissed(): boolean {
  if (typeof localStorage === "undefined") {
    return false;
  }
  try {
    return localStorage.getItem(FALLBACK_DISMISS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissApologistBibleFallbackWarning(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(FALLBACK_DISMISS_STORAGE_KEY, "1");
  } catch {
    // Ignore quota / private-mode failures.
  }
}

/** Returns true if this requested→fallback pair has not warned yet this session. */
export function shouldWarnApologistBibleFallback(
  resolution: ApologistBibleResolution
): boolean {
  if (!SHOW_APOLOGIST_BIBLE_FALLBACK_WARNING) {
    return false;
  }
  if (!resolution.usedFallback) {
    return false;
  }
  if (isApologistBibleFallbackDismissed()) {
    return false;
  }

  const pairKey = `${resolution.requestedSeedId ?? ""}→${resolution.bible}`;
  if (warnedPairs.has(pairKey)) {
    return false;
  }
  warnedPairs.add(pairKey);
  return true;
}

/**
 * Closes the chat panel while a modal is showing, then reopens it when that
 * modal leaves the manager — so modal clicks (outside the chat panel DOM)
 * cannot race the floating chat's outside-dismiss listener.
 *
 * Call after `openModal`. Resolves when the modal has closed (and chat has
 * been restored when it was open before).
 */
export function pauseChatWhileModalOpen(options: {
  wasChatOpen: boolean;
  closeChat: () => void;
  openChat: () => void;
  /** Tracked read: true while the modal registration is still present. */
  isModalOpen: () => boolean;
}): Promise<void> {
  if (options.wasChatOpen) {
    options.closeChat();
  }

  return new Promise((resolve) => {
    let settled = false;
    let stop: (() => void) | null = null;

    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      queueMicrotask(() => {
        stop?.();
      });
      if (options.wasChatOpen) {
        options.openChat();
      }
      resolve();
    };

    stop = effect(() => {
      const stillOpen = options.isModalOpen();
      if (stillOpen || settled) {
        return;
      }
      finish();
    });
  });
}

/**
 * Normalizes a Seed UI locale for Apologist `metadata.language`.
 * Keeps regional tags Apologist documents (`zh-TW`, `pt-BR`); only normalizes
 * underscore separators to hyphens.
 */
export function resolveApologistLanguage(
  uiLanguage: string | null | undefined
): string {
  if (!uiLanguage) {
    return "en";
  }
  const trimmed = uiLanguage.trim();
  if (!trimmed) {
    return "en";
  }
  return trimmed.replace(/_/g, "-");
}

/** Test helper: clear the in-memory once-per-session warn set. */
export function resetApologistBibleFallbackWarnCacheForTests(): void {
  warnedPairs.clear();
}
