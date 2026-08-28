/**
 * Shared `useI18n()` stub for component tests.
 *
 * Tests assert against each call site's `defaultValue` — the English source of
 * truth — rather than the translation key, so a rendered string in an assertion
 * reads the way the user sees it.
 *
 * `vi.mock` factories are hoisted above imports, so a factory cannot reference a
 * normally-imported helper. Reach this module with a dynamic `import()` inside
 * the factory instead:
 *
 * ```ts
 * vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
 *   const { mockI18nManager } = await import("../testUtils/mockI18n");
 *   return mockI18nManager();
 * });
 * ```
 *
 * To vary the language per test, import {@link mockI18nState} normally — a
 * top-level import and the dynamic import above resolve to the same module
 * instance — and assign to it before rendering:
 *
 * ```ts
 * import { mockI18nState } from "../testUtils/mockI18n";
 * mockI18nState.language = "fr";
 * ```
 */

const DEFAULT_LANGUAGE = "en";

/** Mutable stub state. Assign to it to drive a language-dependent assertion. */
export const mockI18nState = { language: DEFAULT_LANGUAGE };

/**
 * Per-key translation overrides. Assign one to stand in for a real locale's
 * string — useful where the point of the test is that the *translation* owns
 * something the code used to hardcode, such as punctuation or word order.
 */
export const mockI18nTranslations: Record<string, string> = {};

/** Restores the defaults. Call from `beforeEach` in tests that mutate state. */
export function resetMockI18n() {
  mockI18nState.language = DEFAULT_LANGUAGE;
  for (const key of Object.keys(mockI18nTranslations)) {
    delete mockI18nTranslations[key];
  }
}

/**
 * Stand-in for i18next's `t`: returns the call site's `defaultValue` with any
 * `{{param}}` placeholders substituted. An entry in
 * {@link mockI18nTranslations} wins over the `defaultValue`, the way a real
 * locale's string does.
 *
 * Falls back to the key when a call site has no `defaultValue`, so a missing one
 * shows up as a key in an assertion rather than as an empty string.
 */
export function mockTranslate(
  key: string,
  options?: Record<string, unknown>
): string {
  let text =
    mockI18nTranslations[key] ??
    (options?.defaultValue as string | undefined) ??
    key;
  for (const [name, value] of Object.entries(options ?? {})) {
    if (name === "defaultValue") continue;
    text = text.replaceAll(`{{${name}}}`, String(value));
  }
  return text;
}

/**
 * Replacement module for `vi.mock`ing `i18n/I18nManager`, with every other
 * export left real.
 *
 * The returned `useI18n` deliberately exposes only `t` and `language` — the
 * fields tests actually read. Pass `overrides` for anything more (`isRtl`, say)
 * rather than widening this for one caller.
 */
export async function mockI18nManager(
  overrides: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");

  return {
    ...actual,
    useI18n: () => ({
      t: mockTranslate,
      // A getter, so a test can reassign `mockI18nState.language` after the
      // module is mocked and still have the next render observe it.
      get language() {
        return mockI18nState.language;
      },
      ...overrides,
    }),
  };
}
