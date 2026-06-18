import { useEffect } from "preact/hooks";
import { signal } from "@preact/signals";
import type { i18n as I18nInstance } from "i18next";
import { useI18n } from "../i18n/I18nManager";

/**
 * Tracks which languages have had their Terms of Service bundle loaded into
 * i18n. Reading this signal during render subscribes the modal so it re-renders
 * on the client once the lazily-loaded policy text arrives.
 */
const loadedLanguages = signal<ReadonlySet<string>>(new Set());

/** In-flight loads, keyed by language, so concurrent renders share one import. */
const loadingPromises = new Map<string, Promise<void>>();

/**
 * Lazily imports the Terms of Service policy bundle for the given language and
 * registers it with i18n. The returned promise is cached per language and
 * resolves once the bundle is available — callers can await it (during SSR) to
 * block rendering until the policy text is present.
 */
function loadTermsOfService(
  i18n: I18nInstance,
  language: string
): Promise<void> {
  let promise = loadingPromises.get(language);
  if (!promise) {
    promise = import(`../i18n/policies/terms-of-service/${language}.json`).then(
      (resources) => {
        i18n.addResourceBundle(language, "terms-of-service", resources.default);
        loadedLanguages.value = new Set(loadedLanguages.value).add(language);
      }
    );
    loadingPromises.set(language, promise);
  }
  return promise;
}

/**
 * Modal that displays the Terms of Service.
 *
 * The policy body lives in the `terms-of-service_policy` translation key as a
 * block of HTML, so it is rendered with `dangerouslySetInnerHTML`. The modal is
 * a controlled component: the parent owns the open state and passes `onClose`,
 * mirroring how {@link BibleSelector} is wired up.
 *
 * The policy bundle is loaded lazily the first time the modal opens. During SSR
 * we suspend (throw the load promise) so the server-rendered HTML includes the
 * policy text; on the client we render immediately and re-render once the
 * bundle finishes loading.
 */
export function TermsOfServiceModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { language, t, i18n } = useI18n();

  // Read unconditionally so the client subscribes and re-renders once loaded.
  const isLoaded = loadedLanguages.value.has(language);

  // During SSR, block rendering until the policy text is available.
  if (isOpen && import.meta.env.SSR && !isLoaded) {
    throw loadTermsOfService(i18n, language);
  }

  // On the client, kick off the load when the modal opens.
  useEffect(() => {
    if (isOpen && !loadedLanguages.value.has(language)) {
      loadTermsOfService(i18n, language);
    }
  }, [isOpen, language]);

  if (!isOpen) {
    return null;
  }

  const title = t("terms-of-service", { defaultValue: "Terms of service" });

  return (
    <div
      className="sb-footnote-modal-overlay"
      onClick={onClose}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className="sb-footnote-modal sb-tos-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event: MouseEvent) => event.stopPropagation()}
      >
        <div className="sb-footnote-modal-header">
          <h3 className="sb-footnote-modal-title">{title}</h3>
          <button
            type="button"
            className="sb-footnote-modal-close"
            aria-label={t("close", { defaultValue: "Close" })}
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div
          className="sb-footnote-modal-content sb-tos-content"
          dangerouslySetInnerHTML={{
            __html: t("terms-of-service_policy", {
              ns: "terms-of-service",
              defaultValue: "",
            }),
          }}
        />
      </div>
    </div>
  );
}
