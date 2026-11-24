import "./LegalDialog.css";
import { useEffect } from "preact/hooks";
import { signal } from "@preact/signals";
import type { i18n as I18nInstance } from "i18next";
import { useI18n } from "../../i18n/I18nManager";
import { Dialog } from "../Dialog/Dialog";

/**
 * A legal document. Each is a folder of per-language bundles under
 * `i18n/policies/`, loaded into the i18n namespace of the same name, with its
 * text in the `{document}-policy` key as a block of HTML.
 */
export type LegalDocument =
  | "terms-of-service"
  | "privacy-policy"
  | "code-of-conduct";

type Translate = ReturnType<typeof useI18n>["t"];

const TITLES: Record<LegalDocument, (t: Translate) => string> = {
  "terms-of-service": (t) =>
    t("terms-of-service", { defaultValue: "Terms of service" }),
  "privacy-policy": (t) =>
    t("privacy-policy", { defaultValue: "Privacy policy" }),
  "code-of-conduct": (t) =>
    t("code-of-conduct", { defaultValue: "Code of conduct" }),
};

const bundleKey = (document: LegalDocument, language: string) =>
  `${document}/${language}`;

/**
 * The bundles loaded so far, by `bundleKey`. Reading it while rendering
 * re-renders the window when its text arrives.
 */
const loadedBundles = signal<ReadonlySet<string>>(new Set());

/** Loads in progress, so windows open at once share one import. */
const loadingBundles = new Map<string, Promise<void>>();

/**
 * Loads `document`'s text in `language` into i18n. A window loads its own
 * when it opens; the server render waits for this first, so a page opened
 * with a window (its `?terms=open` style link) has the text in its HTML.
 *
 * Never rejects: a failure is logged and the window shows no text, rather
 * than the server render failing the whole page. The next open tries again.
 */
export function loadLegalText(
  i18n: I18nInstance,
  document: LegalDocument,
  language: string
): Promise<void> {
  const key = bundleKey(document, language);
  let promise = loadingBundles.get(key);
  if (!promise) {
    promise = import(`../../i18n/policies/${document}/${language}.json`)
      .then((resources) => {
        i18n.addResourceBundle(language, document, resources.default);
        loadedBundles.value = new Set(loadedBundles.value).add(key);
      })
      .catch((error) => {
        console.error(`Failed to load the ${document} text`, error);
        loadingBundles.delete(key);
      });
    loadingBundles.set(key, promise);
  }
  return promise;
}

/**
 * The terms of service, privacy policy or code of conduct, in a window. The
 * caller renders it while it's open.
 */
export function LegalDialog({
  document,
  onClose,
}: {
  document: LegalDocument;
  onClose: () => void;
}) {
  const { language, t, i18n } = useI18n();
  const isLoaded = loadedBundles.value.has(bundleKey(document, language));

  useEffect(() => {
    if (!isLoaded) {
      void loadLegalText(i18n, document, language);
    }
  }, [document, language, isLoaded]);

  return (
    // Drawn in place, not at the end of <body>: a `?terms=open` style link
    // has the server draw it, and the first render here has to match that.
    <Dialog
      className="sb-legal-dialog"
      title={TITLES[document](t)}
      onClose={onClose}
      portal={false}
    >
      <div
        className="sb-legal-dialog-content"
        dangerouslySetInnerHTML={{
          __html: t(`${document}-policy`, { ns: document, defaultValue: "" }),
        }}
      />
    </Dialog>
  );
}
