import { useEffect, useRef, useState } from "preact/hooks";
import type { SeedBibleState, Translation } from "seed-bible/managers";
import { MaterialIcon, useDragReorder } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import {
  removeId,
  reorderIds,
  resolveCompareOrder,
  type CompareOrderEntry,
  type CompareState,
} from "./compareState";

function TranslationLabel(props: {
  translation: Translation | null;
  id: string;
}) {
  const { translation, id } = props;
  return (
    <>
      <span className="sb-compare-block-abbreviation" dir="auto">
        {translation?.shortName ?? id}
      </span>
      <span className="sb-discover-item-title" dir="auto">
        {translation?.name ?? translation?.englishName ?? ""}
      </span>
    </>
  );
}

/**
 * Add / remove / reorder the comparison set.
 *
 * The translation being read is pinned at the top with no drag handle, matching
 * how it renders in the comparison itself. It only gets a remove button when it
 * is *also* in the saved list — removing it there stops it following the reader
 * around, but it stays visible for as long as it is the translation being read.
 */
export function CompareSettings(props: {
  context: SeedBibleState;
  state: CompareState;
}) {
  const { context, state } = props;
  const { t } = useI18n("compare-extension");

  const savedIds = state.selectedTranslationIds.value;
  const currentTranslationId = state.currentTranslationId.value;
  const translations = context.bibleData.availableTranslations.value;

  // A drag fires `onReorder` on every row crossing. Preview those locally and
  // persist once on release, so one drag is one write rather than one per row.
  const [draftIds, setDraftIds] = useState<string[] | null>(null);
  const draftRef = useRef<string[] | null>(null);
  draftRef.current = draftIds;

  useEffect(() => {
    const commit = () => {
      if (!draftRef.current) {
        return;
      }
      state.setSelectedTranslationIds(draftRef.current);
      draftRef.current = null;
      setDraftIds(null);
    };
    window.addEventListener("pointerup", commit);
    window.addEventListener("pointercancel", commit);
    return () => {
      window.removeEventListener("pointerup", commit);
      window.removeEventListener("pointercancel", commit);
    };
  }, [state]);

  const ids = draftIds ?? savedIds;
  const order = resolveCompareOrder(ids, currentTranslationId);
  const pinned = order.find((entry) => entry.isCurrent) ?? null;
  const draggable = order.filter((entry) => !entry.isCurrent);

  // `useDragReorder` counts rendered rows; the saved list may be ordered
  // differently because the current translation is hoisted out of it. Map each
  // rendered index back to its position in the saved array before reordering.
  const { getRowClassName, getHandleProps } = useDragReorder({
    itemCount: draggable.length,
    onReorder: (from, to) => {
      const fromSaved = draggable[from]?.savedIndex;
      const toSaved = draggable[to]?.savedIndex;
      if (fromSaved === undefined || toSaved === undefined) {
        return;
      }
      setDraftIds(reorderIds(ids, fromSaved, toSaved));
    },
  });

  const findTranslation = (id: string): Translation | null =>
    translations.find((translation) => translation.id === id) ?? null;

  const remove = (id: string) => {
    state.setSelectedTranslationIds(removeId(ids, id));
    // A remove click during an in-progress drag has just persisted the
    // draft-aware order minus `id` — clear the draft so the pointerup that
    // eventually lands doesn't commit the stale, pre-removal draft over it.
    draftRef.current = null;
    setDraftIds(null);
  };

  // `sb-discover-item-delete` is the playlist editor's own remove button: a
  // bare icon with no background or border until hovered.
  const renderRemoveButton = (entry: CompareOrderEntry) => (
    <button
      type="button"
      className="sb-discover-item-delete"
      aria-label={t("remove-translation", {
        defaultValue: "Remove translation",
      })}
      title={t("remove-translation", { defaultValue: "Remove translation" })}
      onClick={() => remove(entry.id)}
    >
      <MaterialIcon>delete</MaterialIcon>
    </button>
  );

  return (
    <div className="sb-compare-settings-shell">
      <div className="sb-discover-pane sb-compare-settings">
        <ul className="sb-discover-list">
          {pinned && (
            <li className="sb-discover-item sb-discover-item--row sb-compare-settings-pinned">
              <span className="sb-compare-settings-pin">
                <MaterialIcon>auto_stories</MaterialIcon>
              </span>
              <span className="sb-compare-settings-label">
                <TranslationLabel
                  translation={findTranslation(pinned.id)}
                  id={pinned.id}
                />
                <span className="sb-compare-picker-note">
                  {t("currently-reading", {
                    defaultValue: "Currently reading",
                  })}
                </span>
              </span>
              {pinned.savedIndex >= 0 && renderRemoveButton(pinned)}
            </li>
          )}

          {draggable.map((entry, index) => (
            <li
              key={entry.id}
              className={
                "sb-discover-item sb-discover-item--row" +
                getRowClassName(index)
              }
            >
              <button
                type="button"
                className="sb-discover-item-drag-handle"
                aria-label={t("drag-to-reorder-translation", {
                  defaultValue: "Drag to reorder",
                })}
                {...getHandleProps(index)}
              >
                <MaterialIcon>drag_indicator</MaterialIcon>
              </button>
              <span className="sb-compare-settings-label">
                <TranslationLabel
                  translation={findTranslation(entry.id)}
                  id={entry.id}
                />
              </span>
              {renderRemoveButton(entry)}
            </li>
          ))}
        </ul>

        {draggable.length === 0 && (
          <p className="sb-discover-empty">
            {t("no-translations-selected", {
              defaultValue: "No translations added yet.",
            })}
          </p>
        )}
      </div>

      <div className="sb-compare-add-bar">
        <button
          type="button"
          className="sb-compare-add-button"
          onClick={() => {
            state.addReturnTo.value = "settings";
            state.view.value = "add";
          }}
        >
          <MaterialIcon>add</MaterialIcon>
          {t("add-translation", { defaultValue: "Add translation" })}
        </button>
      </div>
    </div>
  );
}
