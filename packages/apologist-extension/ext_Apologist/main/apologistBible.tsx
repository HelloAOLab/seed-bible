import type { ComponentChildren } from "preact";
import { effect, useSignal } from "@preact/signals";
import type { SeedBibleState } from "seed-bible";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { safeLocalStorage } from "@packages/seed-bible/seed-bible/app/ssrEnv";

/**
 * PostHog / FeaturesManager gate for the Apologist unsupported-bible warning.
 * When off, fallback still happens silently.
 */
export const SHOW_APOLOGIST_BIBLE_FALLBACK_WARNING =
  "SHOW_APOLOGIST_BIBLE_FALLBACK_WARNING";

export const APOLOGIST_BIBLE_FALLBACK_MODAL_ID =
  "apologist-bible-fallback-warning";

const APOLOGIST_BIBLE_FALLBACK_DISMISSED_KEY =
  "sb-apologist-bible-fallback-warning-dismissed";

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
  /** Human-readable label for the Seed translation that was requested. */
  requestedLabel: string | null;
  /** Seed translation language (ISO 639-3) when known. */
  requestedLanguage: string | null;
}

function isApologistBibleFallbackDismissed(): boolean {
  return (
    safeLocalStorage.getItem(APOLOGIST_BIBLE_FALLBACK_DISMISSED_KEY) === "true"
  );
}

export function dismissApologistBibleFallbackWarning(): void {
  safeLocalStorage.setItem(APOLOGIST_BIBLE_FALLBACK_DISMISSED_KEY, "true");
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

function translationLabel(
  translation: SeedTranslationRef | null | undefined
): string | null {
  if (!translation) {
    return null;
  }
  return (
    translation.name?.trim() ||
    translation.englishName?.trim() ||
    translation.shortName?.trim() ||
    translation.id?.trim() ||
    null
  );
}

function findSameLanguageSupportedCode(
  language: string | null | undefined,
  availableTranslations: readonly SeedTranslationRef[]
): string | null {
  if (!language) {
    return null;
  }

  const sameLanguage = availableTranslations.filter(
    (t) => t.language === language
  );

  let firstSupported: string | null = null;
  for (const candidate of sameLanguage) {
    const code = mapSeedTranslationToApologistBible(candidate);
    if (!code) {
      continue;
    }
    if (code === APOLOGIST_DEFAULT_BIBLE) {
      return APOLOGIST_DEFAULT_BIBLE;
    }
    if (!firstSupported) {
      firstSupported = code;
    }
  }
  return firstSupported;
}

/**
 * Resolves a Seed Bible translation to an Apologist `metadata.bible` code.
 *
 * Prefer shortName, then raw id, then a language-prefix-stripped id. When
 * unsupported, pick the nearest same-language Seed catalog translation that
 * maps, else English {@link APOLOGIST_DEFAULT_BIBLE}.
 */
export function resolveApologistBible(options: {
  translation: SeedTranslationRef | null | undefined;
  availableTranslations?: readonly SeedTranslationRef[];
}): ApologistBibleResolution {
  const { translation, availableTranslations = [] } = options;
  const direct = mapSeedTranslationToApologistBible(translation);
  if (direct) {
    return {
      code: direct,
      usedFallback: false,
      requestedLabel: translationLabel(translation),
      requestedLanguage: translation?.language ?? null,
    };
  }

  const sameLanguage =
    findSameLanguageSupportedCode(
      translation?.language,
      availableTranslations
    ) ?? null;

  return {
    code: sameLanguage ?? APOLOGIST_DEFAULT_BIBLE,
    usedFallback: true,
    requestedLabel: translationLabel(translation),
    requestedLanguage: translation?.language ?? null,
  };
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

export async function pauseChatWhileModalOpen(
  context: Pick<SeedBibleState, "sidebar" | "modals">,
  openModal: () => string
): Promise<void> {
  const wasChatOpen = context.sidebar.isChatPanelOpen.value;
  if (wasChatOpen) {
    context.sidebar.closeChatPanel();
  }

  const modalId = openModal();

  await new Promise<void>((resolve) => {
    const isClosed = () =>
      !context.modals.modals.value.some((modal) => modal.id === modalId);

    if (isClosed()) {
      resolve();
      return;
    }

    const stop = effect(() => {
      // Track the modals list.
      void context.modals.modals.value;
      if (isClosed()) {
        stop();
        resolve();
      }
    });
  });

  if (wasChatOpen) {
    context.sidebar.openChatPanel();
  }
}

function ApologistBibleFallbackWarningContent(props: {
  t: (key: string, options?: Record<string, unknown>) => string;
  requestedLabel: string | null;
  fallbackCode: string;
  onDismiss: () => void;
  onContinue: () => void;
}): ComponentChildren {
  const { t, requestedLabel, fallbackCode, onDismiss, onContinue } = props;
  const dontAskAgain = useSignal(false);

  return (
    <div className="sb-session-close-confirm">
      <p className="sb-session-close-confirm-message">
        {t("apologist-bible-fallback-warning-body", {
          defaultValue: requestedLabel
            ? `Apologist doesn't support {{requested}} yet, so quotes will use {{fallback}} instead.`
            : `Apologist doesn't support this Bible translation yet, so quotes will use {{fallback}} instead.`,
          requested: requestedLabel ?? "",
          fallback: fallbackCode.toUpperCase(),
        })}
      </p>
      <label className="sb-session-close-confirm-dontshow">
        <input
          type="checkbox"
          checked={dontAskAgain.value}
          onChange={(event) => {
            dontAskAgain.value = (
              event.currentTarget as HTMLInputElement
            ).checked;
          }}
        />
        <span>
          {t("dont-show-again", { defaultValue: "Don't show this again" })}
        </span>
      </label>
      <div className="sb-session-close-confirm-actions">
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onDismiss}
        >
          {t("dismiss", { defaultValue: "Dismiss" })}
        </button>
        <button
          type="button"
          className="sb-annotation-conflict-confirm"
          onClick={() => {
            if (dontAskAgain.value) {
              dismissApologistBibleFallbackWarning();
            }
            onContinue();
          }}
        >
          {t("continue", { defaultValue: "Continue" })}
        </button>
      </div>
    </div>
  );
}

/**
 * When the resolved bible used a fallback, optionally shows a one-time warning
 * (feature-gated + localStorage don't-ask-again), pausing chat while the modal
 * is open so the stream doesn't start underneath it.
 *
 * @returns `true` if the caller should proceed (no warning, or user continued).
 *   `false` if the user dismissed / closed the modal (go back — do not call AI).
 */
export async function warnIfApologistBibleFallback(
  context: SeedBibleState,
  resolution: ApologistBibleResolution
): Promise<boolean> {
  if (!resolution.usedFallback) {
    return true;
  }
  if (
    !context.features.isFeatureEnabled(SHOW_APOLOGIST_BIBLE_FALLBACK_WARNING)
      .value
  ) {
    return true;
  }
  if (isApologistBibleFallbackDismissed()) {
    return true;
  }

  let continued = false;
  await pauseChatWhileModalOpen(context, () =>
    context.modals.openModal({
      id: APOLOGIST_BIBLE_FALLBACK_MODAL_ID,
      useCasualOSApp: false,
      title: {
        key: "apologist-bible-fallback-warning-title",
        defaultValue: "Bible translation unavailable",
      },
      content: ({ t }) => (
        <ApologistBibleFallbackWarningContent
          t={t}
          requestedLabel={resolution.requestedLabel}
          fallbackCode={resolution.code}
          onDismiss={() =>
            context.modals.closeModal(APOLOGIST_BIBLE_FALLBACK_MODAL_ID)
          }
          onContinue={() => {
            continued = true;
            context.modals.closeModal(APOLOGIST_BIBLE_FALLBACK_MODAL_ID);
          }}
        />
      ),
    })
  );
  return continued;
}

/**
 * Looks up the Seed translation AI chat should use (pinned AI default, else
 * active tab) from the app catalog / tab reading state.
 */
export function getEffectiveSeedTranslationForAi(
  context: SeedBibleState
): SeedTranslationRef | null {
  const tab = context.app.selectedTab.value;
  const tabTranslationId = tab?.readingState.translationId.value ?? null;
  const effectiveId =
    context.chats.getEffectiveAiBibleTranslationId(tabTranslationId);

  if (!effectiveId) {
    return tab?.readingState.translation.value ?? null;
  }

  const fromCatalog = context.bibleData.availableTranslations.value.find(
    (t) => t.id === effectiveId
  );
  if (fromCatalog) {
    return fromCatalog;
  }

  const tabTranslation = tab?.readingState.translation.value;
  if (tabTranslation?.id === effectiveId) {
    return tabTranslation;
  }

  return {
    id: effectiveId,
    shortName: effectiveId,
    language: tabTranslation?.language ?? "eng",
    name: effectiveId,
  };
}

/**
 * Full UI locale for Apologist `metadata.language` / instructions: underscores
 * become hyphens so BCP-47 forms like `zh-TW` and `pt-BR` stay intact.
 */
export function uiLocaleForApologist(language: string): string {
  return language.replace(/_/g, "-");
}
