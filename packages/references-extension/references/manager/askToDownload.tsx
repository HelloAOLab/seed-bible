import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers";
import {
  estimateTranslationSizeBytes,
  formatBytes,
  type OfflineTranslationsManager,
} from "@packages/seed-bible/seed-bible/managers/OfflineTranslationsManager";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { useI18n } from "seed-bible/i18n";
import {
  downloadReferences,
  estimateReferencesSizeBytes,
  loadReferenceDatasetIndex,
} from "./utils";
import "./askToDownload.css";

const MODAL_ID = "ext_references-download";

/**
 * Records that this device has been offered the download, so the offer is made
 * once rather than on every page load. Only its presence matters.
 */
const PROMPT_ANSWERED_KEY = "sb-references-download-prompt";

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** The translation the offer covers, or null when there is nothing to add. */
interface OfferedTranslation {
  id: string;
  name: string;
  /** Estimated download size, or null when the API gave no verse count. */
  sizeBytes: number | null;
}

const hasBeenOffered = (): boolean => {
  try {
    return window.localStorage.getItem(PROMPT_ANSWERED_KEY) !== null;
  } catch {
    // Storage blocked (private browsing, say). Treated as "not yet offered":
    // repeating the offer is a smaller problem than never making it.
    return false;
  }
};

const rememberOffered = (): void => {
  try {
    window.localStorage.setItem(PROMPT_ANSWERED_KEY, String(Date.now()));
  } catch {
    // Best effort — worst case the offer comes back on a later visit.
  }
};

/**
 * The translation on screen, when it's one the offer can usefully add.
 *
 * Null when nothing is being read yet, when the device can't store downloads,
 * or when this translation is already saved — in each case the offer covers
 * the cross-references alone.
 */
const translationToOffer = (
  state: SeedBibleState
): OfferedTranslation | null => {
  const offline = state.bibleData.offline;
  if (!offline.supported) {
    return null;
  }

  const translation =
    state.app.currentReadingState.value?.tab.readingState.translation.value;
  if (!translation || offline.isDownloaded(translation.id)) {
    return null;
  }

  return {
    id: translation.id,
    name: translation.shortName || translation.name,
    sizeBytes: estimateTranslationSizeBytes(translation),
  };
};

/**
 * Guards against a second run over the same chapters — from accepting twice, or
 * from the extension being reinstalled while a download is still going.
 */
let downloadInFlight = false;

/**
 * Saves the translation and then the whole cross-reference dataset in the
 * background, reporting through toasts.
 *
 * Deliberately detached from the dialog, which closes the moment the offer is
 * accepted: nothing here may depend on it still being mounted, and callers
 * start this and walk away rather than awaiting it. The toasts name their
 * namespace for the same reason — they're raised outside the component that
 * bound it through `useI18n`.
 *
 * The translation goes first: it's the half that makes the reader usable
 * offline on its own, since cross-references are no use without the text they
 * point into. The two run in sequence so they aren't competing for the same
 * connections.
 */
const startBackgroundDownload = async (options: {
  toast: (message: string) => void;
  t: Translate;
  offline: OfflineTranslationsManager;
  translation: OfferedTranslation | null;
}): Promise<void> => {
  const { toast, t, offline, translation } = options;

  if (downloadInFlight) {
    return;
  }
  downloadInFlight = true;

  toast(
    t("download-started", {
      ns: "ext_references",
      defaultValue: "Downloading in the background…",
    })
  );

  try {
    // Reports failure by returning false rather than throwing, so a translation
    // that won't download can't take the cross-references down with it.
    const translationSaved = translation
      ? await offline.downloadTranslation(translation.id)
      : true;

    const result = await downloadReferences();

    if (result.failed > 0) {
      toast(
        t("download-partial", {
          ns: "ext_references",
          downloaded: result.downloaded,
          total: result.total,
          failed: result.failed,
          defaultValue:
            "Saved {{downloaded}} of {{total}} chapters. {{failed}} couldn't be downloaded.",
        })
      );
      return;
    }

    if (translation && !translationSaved) {
      toast(
        t("download-translation-failed", {
          ns: "ext_references",
          name: translation.name,
          defaultValue:
            "Saved the cross-references, but {{name}} couldn't be downloaded.",
        })
      );
      return;
    }

    toast(
      translation
        ? t("download-done-with-translation", {
            ns: "ext_references",
            name: translation.name,
            defaultValue:
              "Cross-references and {{name}} are now available offline",
          })
        : t("download-done", {
            ns: "ext_references",
            defaultValue: "Cross-references are now available offline",
          })
    );
  } catch (error) {
    console.error("Could not download the references dataset.", error);
    toast(
      t("download-failed", {
        ns: "ext_references",
        defaultValue:
          "Couldn't download the cross-references. Check your connection and try again.",
      })
    );
  } finally {
    downloadInFlight = false;
  }
};

/**
 * The body of the offer. The frame — overlay, title bar, close button — comes
 * from the app's modal host, so this is only what sits inside it.
 */
function AskToDownloadModal(props: {
  state: SeedBibleState;
  onClose: () => void;
}) {
  const { state, onClose } = props;
  const { t } = useI18n("ext_references");

  const translation = translationToOffer(state);

  // The size comes from the dataset's own reference count, so it needs
  // `books.json`. The dialog opens without waiting for that and says nothing
  // about size until it lands — or at all, if it never does.
  const referencesSize = useSignal<number | null>(null);
  useEffect(() => {
    let active = true;
    loadReferenceDatasetIndex()
      .then((index) => {
        if (active) {
          referencesSize.value = estimateReferencesSizeBytes(
            index.referenceCount
          );
        }
      })
      .catch((error: unknown) => {
        console.warn("Could not estimate the reference download size", error);
      });
    return () => {
      active = false;
    };
  }, []);

  const accept = () => {
    onClose();
    void startBackgroundDownload({
      toast: state.app.toast,
      t,
      offline: state.bibleData.offline,
      translation,
    });
  };

  const body = translation
    ? t("download-body-with-translation", {
        name: translation.name,
        defaultValue:
          "Keep every cross-reference on your device, along with {{name}}, so they still open when you have no connection. The download carries on in the background.",
      })
    : t("download-body", {
        defaultValue:
          "Keep every cross-reference on your device so they still open when you have no connection. The download carries on in the background.",
      });

  const sizeEstimate = referencesSize.value;
  const size =
    sizeEstimate === null
      ? null
      : translation && translation.sizeBytes !== null
        ? t("download-size-with-translation", {
            references: formatBytes(sizeEstimate),
            translation: formatBytes(translation.sizeBytes),
            name: translation.name,
            defaultValue:
              "About {{references}} of cross-references, plus {{translation}} for {{name}}.",
          })
        : t("download-size", {
            references: formatBytes(sizeEstimate),
            defaultValue: "About {{references}} of cross-references.",
          });

  return (
    <div className="sb-references-download">
      <div className="sb-references-download-header">
        <div className="sb-references-download-icon" aria-hidden="true">
          <span className="material-symbols-outlined">download</span>
        </div>

        <div className="sb-references-download-text">
          <p className="sb-references-download-body">{body}</p>
          {size ? <p className="sb-references-download-size">{size}</p> : null}
        </div>
      </div>

      <div className="sb-references-download-actions">
        <button
          type="button"
          className="sb-references-download-btn sb-references-download-btn-secondary"
          onClick={onClose}
        >
          {t("download-not-now", { defaultValue: "Not now" })}
        </button>

        <button
          type="button"
          className="sb-references-download-btn sb-references-download-btn-primary"
          onClick={accept}
        >
          {t("download-confirm", { defaultValue: "Download" })}
        </button>
      </div>
    </div>
  );
}

function openAskToDownloadModal(state: SeedBibleState): void {
  state.modals.openModal({
    id: MODAL_ID,
    title: {
      key: "download-title",
      ns: "ext_references",
      defaultValue: "Save cross-references for offline use?",
    },
    content: () => (
      <AskToDownloadModal
        state={state}
        onClose={() => state.modals.closeModal(MODAL_ID)}
      />
    ),
  });
}

/**
 * Offers the download once, when the extension is first installed on this
 * device, and returns the cleanup that takes the offer back down.
 *
 * A device that's offline isn't asked and isn't marked as asked, so the offer
 * still gets made on a later visit — there'd be nothing to download now.
 */
export function offerReferenceDownload(state: SeedBibleState): () => void {
  const close = () => state.modals.closeModal(MODAL_ID);

  if (typeof window === "undefined") {
    return close;
  }
  if (hasBeenOffered() || !navigator.onLine) {
    return close;
  }

  rememberOffered();
  openAskToDownloadModal(state);

  return close;
}
