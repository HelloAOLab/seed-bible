import { useEffect } from "preact/hooks";
import { signal } from "@preact/signals";
import type { i18n as I18nInstance } from "i18next";
import { useI18n } from "../../i18n/I18nManager";
import { Dialog } from "../Dialog/Dialog";

/**
 * Tracks which languages have had their Code of Conduct bundle loaded into i18n.
 * Reading this signal during render subscribes the modal so it re-renders on the
 * client once the lazily-loaded policy text arrives.
 */
const loadedLanguages = signal<ReadonlySet<string>>(new Set());

/** In-flight loads, keyed by language, so concurrent renders share one import. */
const loadingPromises = new Map<string, Promise<void>>();

/**
 * Lazily imports the Code of Conduct bundle for the given language and registers
 * it with i18n. The returned promise is cached per language and resolves once
 * the bundle is available. The server render awaits it before rendering, so a
 * page opened with this window shows its text.
 */
// Resolves — never rejects, even on failure (logged below). The server render
// awaits it, so a rejection would take down the whole SSR document; resolving
// lets the modal render with an empty body instead.
export function loadCodeOfConduct(
  i18n: I18nInstance,
  language: string
): Promise<void> {
  let promise = loadingPromises.get(language);
  if (!promise) {
    promise = import(`../../i18n/policies/code-of-conduct/${language}.json`)
      .then((resources) => {
        i18n.addResourceBundle(language, "code-of-conduct", resources.default);
        loadedLanguages.value = new Set(loadedLanguages.value).add(language);
      })
      .catch((error) => {
        console.error("Failed to load code of conduct policy bundle", error);
        // Don't cache the failure — let the next modal open retry the import.
        loadingPromises.delete(language);
      });
    loadingPromises.set(language, promise);
  }
  return promise;
}

/**
 * Modal that displays the Code of Conduct.
 *
 * The policy body lives in the `code-of-conduct_policy` translation key as a
 * block of HTML, so it is rendered with `dangerouslySetInnerHTML`. The modal is
 * a controlled component: the parent owns the open state and passes `onClose`,
 * mirroring {@link TermsOfServiceModal} and {@link PrivacyPolicyModal}.
 *
 * The policy bundle is loaded lazily the first time the modal opens, and the
 * modal re-renders once it arrives. A page opened with the modal (its `?…=open`
 * link) has the bundle loaded by the server render first, so the HTML includes
 * the policy text.
 */
export function CodeOfConductModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { language, t, i18n } = useI18n();

  // Read unconditionally so the client subscribes and re-renders once loaded.
  const isLoaded = loadedLanguages.value.has(language);

  // In the browser, start the load when the modal opens. The server render
  // loads it before rendering (`standalone/entry-ssr.tsx`).
  useEffect(() => {
    if (isOpen && !isLoaded) {
      loadCodeOfConduct(i18n, language);
    }
  }, [isOpen, language, isLoaded]);

  if (!isOpen) {
    return null;
  }

  const title = t("code-of-conduct", { defaultValue: "Code of conduct" });

  return (
    // Drawn in place, not at the end of <body>: a `?conduct=open` link has
    // the server draw it, and the first render here has to match that.
    <Dialog title={title} onClose={onClose} portal={false}>
      <div
        className="sb-tos-content"
        dangerouslySetInnerHTML={{
          // eslint-disable-next-line seed-bible-i18n/translation-missing-keys
          __html: t("code-of-conduct-policy", {
            ns: "code-of-conduct",
            defaultValue: "",
          }),
        }}
      />
    </Dialog>
  );
}
