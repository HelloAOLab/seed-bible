import "./AdoptDeviceContentModal.css";
import { effect } from "@preact/signals";
import { useI18n } from "../../i18n/I18nManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { AdoptionChoice } from "../../managers/RecordSyncManager";

/** The id every sign-in shares, so only one prompt is ever open. */
const MODAL_ID = "adopt-device-content";

export type DeviceContentKind = "highlights" | "notes";

/** Wording for what the device is holding, per combination of kinds. */
function contentLabel(
  kinds: ReadonlySet<DeviceContentKind>,
  t: ReturnType<typeof useI18n>["t"]
): string {
  if (kinds.size === 2) {
    return t("adopt-device-content-kind-both", {
      defaultValue: "highlights and notes",
    });
  }
  return kinds.has("notes")
    ? t("adopt-device-content-kind-notes", { defaultValue: "notes" })
    : t("adopt-device-content-kind-highlights", { defaultValue: "highlights" });
}

export function AdoptDeviceContentModalContent(props: {
  kinds: ReadonlySet<DeviceContentKind>;
  onChoose: (choice: AdoptionChoice) => void;
}) {
  const { kinds, onChoose } = props;
  const { t } = useI18n();
  return (
    <div className="sb-adopt-device-content">
      <p>
        {t("adopt-device-content-message", {
          defaultValue:
            "This device is storing {{content}} that are not associated with any account. Do you want to add them to your account?",
          content: contentLabel(kinds, t),
        })}
      </p>
      <div className="sb-adopt-device-content-actions">
        <button type="button" onClick={() => onChoose("discard")}>
          {t("adopt-device-content-skip", { defaultValue: "Don't add" })}
        </button>
        <button
          type="button"
          className="sb-adopt-device-content-add"
          onClick={() => onChoose("add")}
        >
          {t("adopt-device-content-add", { defaultValue: "Add to account" })}
        </button>
      </div>
    </div>
  );
}

/**
 * One prompt per sign-in, shared by every sync manager that asks.
 *
 * Callers arrive independently (highlights and notes each run their own
 * adoption effect), so the first opens the dialog and later ones join it:
 * `openModal` upserts by id, which re-renders the body with every kind named.
 * All callers get the same answer. Closing the dialog any other way resolves
 * `keep`, so a dismissed prompt never blocks the sign-in sync pass.
 */
export function createAdoptionPrompt(
  modals: ModalManager
): (owner: string, kind: DeviceContentKind) => Promise<AdoptionChoice> {
  let open: {
    owner: string;
    kinds: Set<DeviceContentKind>;
    resolvers: ((choice: AdoptionChoice) => void)[];
  } | null = null;

  const settle = (choice: AdoptionChoice) => {
    const current = open;
    open = null;
    if (!current) {
      return;
    }
    modals.closeModal(MODAL_ID);
    for (const resolve of current.resolvers) {
      resolve(choice);
    }
  };

  const show = () => {
    const current = open;
    if (!current) {
      return;
    }
    modals.openModal({
      id: MODAL_ID,
      title: {
        key: "adopt-device-content-title",
        defaultValue: "Sync device content?",
      },
      content: () => (
        <AdoptDeviceContentModalContent
          kinds={current.kinds}
          onChoose={settle}
        />
      ),
    });
  };

  // The host's close button bypasses `settle`; treat that as "keep". `show`
  // sets `open` before opening the modal and `settle` clears it before
  // closing, so this only ever fires on a close that came from the host.
  effect(() => {
    const stillOpen = modals.modals.value.some((m) => m.id === MODAL_ID);
    if (open && !stillOpen) {
      settle("keep");
    }
  });

  return (owner, kind) =>
    new Promise<AdoptionChoice>((resolve) => {
      if (open && open.owner === owner) {
        open.kinds.add(kind);
        open.resolvers.push(resolve);
      } else {
        open = { owner, kinds: new Set([kind]), resolvers: [resolve] };
      }
      show();
    });
}
