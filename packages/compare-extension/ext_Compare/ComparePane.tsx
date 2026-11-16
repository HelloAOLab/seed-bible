import "./Compare.css";
import type { SeedBibleState } from "seed-bible/managers";
import { Button, IconButton, MaterialIcon } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import { CompareSettings } from "./CompareSettings";
import { CompareVerses } from "./CompareVerses";
import { TranslationPicker } from "./TranslationPicker";
import { formatSnapshotReference, type CompareState } from "./compareState";

/**
 * Title shown in the pane's `PaneHeader`. In the comparison it's "Compare" plus
 * the reference; in the sub-views it becomes a back button plus the sub-view's
 * name, so navigation lives in the pane chrome rather than the body — the same
 * arrangement the Discover pane uses for the playlist editor.
 */
export function ComparePaneTitle(props: { state: CompareState }) {
  const { state } = props;
  // `useI18n(ns)` pins every lookup to this namespace, so all of the pane's
  // strings — "Back" included — live in the extension's own `extension.json`.
  const { t } = useI18n("compare-extension");
  const view = state.view.value;

  if (view !== "compare") {
    const label =
      view === "settings"
        ? t("compare-settings", { defaultValue: "Compare settings" })
        : t("add-translation", { defaultValue: "Add translation" });

    return (
      <div className="sb-discover-title-row">
        <IconButton
          icon={<MaterialIcon className="rtl-mirror">arrow_back</MaterialIcon>}
          label={t("back", { defaultValue: "Back" })}
          onClick={() => {
            state.view.value =
              view === "add" ? state.addReturnTo.value : "compare";
          }}
        />
        <span className="sb-discover-title">{label}</span>
      </div>
    );
  }

  const books =
    state.sourceReadingState.value?.translationBooks.value?.books ?? [];
  const reference = formatSnapshotReference(state.snapshot.value, (bookId) => {
    const book = books.find((entry) => entry.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  });

  // Own classes rather than `sb-discover-title`: that one is `flex: 1`, which
  // would let the reference squeeze the "Compare" label down to nothing.
  return (
    <div className="sb-compare-title-row">
      <span className="sb-compare-title">
        {t("compare", { defaultValue: "Compare" })}
      </span>
      {reference && (
        <span className="sb-compare-reference" dir="auto">
          {reference}
        </span>
      )}
    </div>
  );
}

/** Settings gear, shown in the pane header next to the close button. */
export function ComparePaneHeader(props: { state: CompareState }) {
  const { state } = props;
  const { t } = useI18n("compare-extension");

  if (state.view.value !== "compare") {
    return null;
  }

  return (
    <IconButton
      className="sb-compare-settings-button"
      icon="settings"
      label={t("compare-settings", { defaultValue: "Compare settings" })}
      onClick={() => {
        state.view.value = "settings";
      }}
    />
  );
}

/** The pane body: the comparison, the settings list, or the translation picker. */
export function ComparePane(props: {
  context: SeedBibleState;
  state: CompareState;
}) {
  const { context, state } = props;
  const { t } = useI18n("compare-extension");
  const view = state.view.value;

  if (view === "settings") {
    return <CompareSettings context={context} state={state} />;
  }

  if (view === "add") {
    return <TranslationPicker context={context} state={state} />;
  }

  // Only one block is rendering, so there is nothing to compare it against
  // yet. Says so, rather than leaving the pane looking broken. Checked
  // against the rendered order, not the saved list's length — the saved list
  // can hold just the translation being read (reachable from the picker),
  // which `order` collapses back down to that same single block.
  const hasNothingToCompareWith = state.order.value.length <= 1;

  return (
    <div className="sb-compare-pane">
      <div className="sb-compare-scroll">
        <CompareVerses context={context} state={state} />
        {hasNothingToCompareWith && (
          <div className="sb-compare-empty">
            <MaterialIcon className="sb-compare-empty-icon">
              text_compare
            </MaterialIcon>
            <p className="sb-compare-empty-title">
              {t("nothing-to-compare-title", {
                defaultValue: "No translations to compare yet",
              })}
            </p>
            <p className="sb-compare-empty-hint">
              {t("nothing-to-compare-hint", {
                defaultValue:
                  "Add translations to compare the selected verses with",
              })}
            </p>
          </div>
        )}
      </div>
      <div className="sb-compare-add-bar">
        <Button
          className="sb-compare-add-button"
          variant="primary"
          size="lg"
          shape="pill"
          icon="add"
          onClick={() => {
            state.addReturnTo.value = "compare";
            state.view.value = "add";
          }}
        >
          {t("add-translation", { defaultValue: "Add translation" })}
        </Button>
      </div>
    </div>
  );
}
