import "./Bookmarks.css";
import { useSignal } from "@preact/signals";
import { useI18n } from "../../i18n/I18nManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  MAX_BOOKMARKS,
  type Bookmark,
  type BookmarkDetails,
  type BookmarkLocation,
} from "../../managers/BookmarksManager";
import {
  BOOKMARK_COLOR_IDS,
  DEFAULT_BOOKMARK_COLOR_ID,
  bookmarkColorValue,
  type BookmarkColorId,
} from "../../managers/ThemeManager";
import { MaterialIcon } from "../icons";
import { openReaderLocation } from "../Tabs/openReaderLocation";

type Translate = ReturnType<typeof useI18n>["t"];

/** The bookmark ribbon, in a 24×24 box spanning x 6–18 and y 3–21. */
const BOOKMARK_PATH =
  "M18 7V21L12 17L6 21V7C6 5.93913 6.42143 4.92172 7.17157 4.17157C7.92172 3.42143 8.93913 3 10 3H14C15.0609 3 16.0783 3.42143 16.8284 4.17157C17.5786 4.92172 18 5.93913 18 7Z";

/**
 * More than three offset ribbons inside a 24px target turn to mush, so a
 * chapter holding more shows three. The accessible label still names them all.
 */
const MAX_STACKED_GLYPHS = 3;

/**
 * Where each ribbon of a stack sits, front first: scaled down and stepped up
 * and to the inline end so the back copies peek out behind the front one, and
 * the whole group centered in the 24×24 box. Offsetting copies of the ribbon
 * (rather than drawing an even stack of sheets) is what keeps the shape
 * reading as a bookmark beside the save button.
 */
const STACK_LAYOUTS: Record<number, { x: number; y: number }[]> = {
  2: [
    { x: 0.05, y: 2.55 },
    { x: 3.55, y: 1.05 },
  ],
  3: [
    { x: -1.7, y: 3.3 },
    { x: 1.8, y: 1.8 },
    { x: 5.3, y: 0.3 },
  ],
};
const STACK_SCALE = 0.85;

/** A single bookmark ribbon filled in a bookmark color. */
export function BookmarkGlyph(props: {
  colorId: string;
  size?: number;
  className?: string;
}) {
  const size = props.size ?? 16;
  const color = bookmarkColorValue(props.colorId);
  return (
    <svg
      className={`sb-bookmark-glyph${props.className ? ` ${props.className}` : ""}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d={BOOKMARK_PATH}
        fill={color}
        stroke={color}
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    </svg>
  );
}

/**
 * The reader's bookmark icon for the bookmarks on the current chapter (most
 * recently moved first): an outline when there are none, a filled ribbon in
 * the bookmark's color for one, and a fan of up to three ribbons — the most
 * recently moved in front — for more.
 */
export function BookmarkStackIcon(props: {
  bookmarks: readonly Bookmark[];
  size?: number;
}) {
  const size = props.size ?? 22;
  const shown = props.bookmarks.slice(0, MAX_STACKED_GLYPHS);

  if (shown.length === 0) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d={BOOKMARK_PATH}
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
      </svg>
    );
  }

  if (shown.length === 1) {
    return <BookmarkGlyph colorId={shown[0]!.colorId} size={size} />;
  }

  const layout = STACK_LAYOUTS[shown.length]!;
  // Painted back to front so the most recently moved ribbon ends up on top.
  // Each one is outlined in the header's background, which cuts a thin gap
  // between it and the ribbon behind it.
  return (
    <svg
      className="sb-bookmark-stack-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {shown
        .map((bookmark, index) => ({ bookmark, offset: layout[index]! }))
        .reverse()
        .map(({ bookmark, offset }) => (
          <path
            key={bookmark.id}
            d={BOOKMARK_PATH}
            transform={`translate(${offset.x} ${offset.y}) scale(${STACK_SCALE})`}
            fill={bookmarkColorValue(bookmark.colorId)}
            stroke="var(--sb-bookmark-stack-gap-color)"
            stroke-width="2"
            stroke-linejoin="round"
          />
        ))}
    </svg>
  );
}

/**
 * Accessible label for the reader's bookmark button. Carries the count and the
 * names, so what the colors show isn't lost on someone who can't see them or
 * tell the palette apart.
 */
export function bookmarkButtonLabel(
  t: Translate,
  bookmarks: readonly Bookmark[]
): string {
  if (bookmarks.length === 0) {
    return t("bookmark-this-chapter", {
      defaultValue: "Bookmark this chapter",
    });
  }
  const names = bookmarks.map((bookmark) => bookmark.name).join(", ");
  if (bookmarks.length === 1) {
    return t("bookmark-on-this-chapter", {
      defaultValue: "Bookmark on this chapter: {{names}}",
      names,
    });
  }
  return t("bookmarks-on-this-chapter", {
    defaultValue: "{{count}} bookmarks on this chapter: {{names}}",
    count: bookmarks.length,
    names,
  });
}

function bookmarkColorLabel(t: Translate, colorId: BookmarkColorId): string {
  switch (colorId) {
    case "orange":
      return t("bookmark-color-orange", { defaultValue: "Orange" });
    case "red":
      return t("bookmark-color-red", { defaultValue: "Red" });
    case "yellow":
      return t("bookmark-color-yellow", { defaultValue: "Yellow" });
    case "green":
      return t("bookmark-color-green", { defaultValue: "Green" });
    case "blue":
      return t("bookmark-color-blue", { defaultValue: "Blue" });
    case "purple":
      return t("bookmark-color-purple", { defaultValue: "Purple" });
  }
}

/** Longest name the form accepts — enough for "Sermon prep, week 3". */
const MAX_BOOKMARK_NAME_LENGTH = 40;

/**
 * Name and color fields for one bookmark. The one form both the bookmark modal
 * (creating) and the sidebar panel (creating and editing) use, so the two can't
 * drift apart.
 */
export function BookmarkForm(props: {
  value: BookmarkDetails;
  onChange: (value: BookmarkDetails) => void;
  /** Called on Enter in the name field. */
  onSubmit?: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const { value, onChange, onSubmit, autoFocus, disabled } = props;
  const { t } = useI18n();

  return (
    <div className="sb-bookmark-form">
      <input
        className="sb-bookmark-form-name"
        type="text"
        autoFocus={autoFocus}
        disabled={disabled}
        maxLength={MAX_BOOKMARK_NAME_LENGTH}
        value={value.name}
        aria-label={t("bookmark-name", { defaultValue: "Bookmark name" })}
        placeholder={t("bookmark-name", { defaultValue: "Bookmark name" })}
        onInput={(event: Event) => {
          const target = event.target as HTMLInputElement;
          onChange({ ...value, name: target.value });
        }}
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key === "Enter" && onSubmit) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
      <div
        className="sb-bookmark-form-colors"
        role="radiogroup"
        aria-label={t("bookmark-color", { defaultValue: "Bookmark color" })}
      >
        {BOOKMARK_COLOR_IDS.map((colorId) => {
          const isSelected = value.colorId === colorId;
          return (
            <button
              key={colorId}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={bookmarkColorLabel(t, colorId)}
              title={bookmarkColorLabel(t, colorId)}
              disabled={disabled}
              className={`sb-bookmark-form-color${
                isSelected ? " sb-bookmark-form-color-selected" : ""
              }`}
              style={{ color: bookmarkColorValue(colorId) }}
              onClick={() => onChange({ ...value, colorId })}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Name and color for a bookmark about to be created: "My bookmark" while that
 * name is free, and the first color nobody is using yet, so a new bookmark is
 * told apart from the others without the user having to choose.
 */
function nextBookmarkDraft(
  t: Translate,
  existing: readonly Bookmark[]
): BookmarkDetails {
  const takenNames = new Set(existing.map((bookmark) => bookmark.name));
  const defaultName = t("my-bookmark", { defaultValue: "My bookmark" });
  let name = defaultName;
  for (let n = 2; takenNames.has(name); n++) {
    name = t("numbered-bookmark", {
      defaultValue: "Bookmark {{number}}",
      number: n,
    });
  }
  const takenColors = new Set(existing.map((bookmark) => bookmark.colorId));
  const colorId =
    BOOKMARK_COLOR_IDS.find((id) => !takenColors.has(id)) ??
    DEFAULT_BOOKMARK_COLOR_ID;
  return { name, colorId };
}

/**
 * Display text for where a bookmark sits — "Genesis 10" — resolving the book's
 * name in the bookmark's own translation, and falling back to the raw book id
 * until that translation's book list has loaded.
 */
function useBookmarkLocationText(state: SeedBibleState) {
  const { bibleData } = state;
  // Read here so a translation finishing its load re-renders the caller.
  const translationBooks = bibleData.translationBooks.value;
  return (location: BookmarkLocation): string => {
    const entry = translationBooks.get(location.translationId);
    if (!entry) {
      void bibleData
        .getTranslationBooks(location.translationId)
        .catch(() => undefined);
    }
    const bookName =
      entry?.books.find((book) => book.id === location.bookId)?.name ??
      location.bookId;
    return `${bookName} ${location.chapterNumber}`;
  };
}

/** Row id the create form uses in the modal's list. */
const NEW_BOOKMARK_ROW = "new";

/**
 * The bookmark modal: pick a bookmark and save, and it moves to `location`.
 *
 * The list is your bookmarks plus, while one is being created, the create
 * form. A user with no bookmarks gets that same form already open, prefilled
 * as "My bookmark" — so placing a first bookmark and placing a fifth are the
 * same two taps through the same save path, and nothing is written until Save.
 * The first row is preselected.
 */
function BookmarkPickerContent(props: {
  state: SeedBibleState;
  location: BookmarkLocation;
  onClose: () => void;
}) {
  const { state, location, onClose } = props;
  const { bookmarks: manager } = state;
  const { t } = useI18n();
  const locationText = useBookmarkLocationText(state);

  const bookmarks = manager.bookmarks.value;
  /** The create form's contents, once the user has asked for or touched it. */
  const draft = useSignal<BookmarkDetails | null>(null);
  const selectedId = useSignal<string | null>(null);
  const isSaving = useSignal(false);

  // With nothing to pick, the create form is offered without being asked for.
  const effectiveDraft =
    draft.value ??
    (bookmarks.length === 0 ? nextBookmarkDraft(t, bookmarks) : null);
  const rowIds = [
    ...bookmarks.map((bookmark) => bookmark.id),
    ...(effectiveDraft ? [NEW_BOOKMARK_ROW] : []),
  ];
  const selected =
    selectedId.value && rowIds.includes(selectedId.value)
      ? selectedId.value
      : (rowIds[0] ?? null);

  const draftIsValid = !!effectiveDraft && effectiveDraft.name.trim() !== "";
  const canSave =
    !isSaving.value &&
    selected !== null &&
    (selected !== NEW_BOOKMARK_ROW || draftIsValid);
  const canAddNew = manager.canCreate.value && !effectiveDraft;

  const handleSave = async () => {
    if (!canSave || !selected) return;
    isSaving.value = true;
    try {
      if (selected === NEW_BOOKMARK_ROW) {
        if (!effectiveDraft) return;
        const created = await manager.createBookmark(effectiveDraft, location);
        if (!created) {
          throw new Error("The bookmark was not created.");
        }
      } else {
        await manager.moveBookmark(selected, location);
      }
      onClose();
    } catch (err) {
      console.warn("Failed to save bookmark:", err);
      state.app.toast(
        t("bookmark-save-failed", {
          defaultValue: "Couldn't save your bookmark. Please try again.",
        })
      );
    } finally {
      isSaving.value = false;
    }
  };

  const handleRemove = async (id: string) => {
    if (isSaving.value) return;
    isSaving.value = true;
    try {
      await manager.removeBookmark(id);
    } catch (err) {
      console.warn("Failed to remove bookmark:", err);
      state.app.toast(
        t("bookmark-remove-failed", {
          defaultValue: "Couldn't remove that bookmark. Please try again.",
        })
      );
    } finally {
      isSaving.value = false;
    }
  };

  return (
    <div className="sb-bookmark-picker">
      <div
        className="sb-bookmark-picker-list"
        role="radiogroup"
        aria-label={t("bookmarks", { defaultValue: "Bookmarks" })}
      >
        {bookmarks.map((bookmark) => {
          const isSelected = selected === bookmark.id;
          return (
            <div
              key={bookmark.id}
              className={`sb-bookmark-picker-row${
                isSelected ? " sb-bookmark-picker-row-selected" : ""
              }`}
            >
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isSaving.value}
                className="sb-bookmark-picker-choice"
                onClick={() => {
                  selectedId.value = bookmark.id;
                }}
              >
                <BookmarkGlyph colorId={bookmark.colorId} size={18} />
                <span className="sb-bookmark-picker-name">{bookmark.name}</span>
                <span className="sb-bookmark-picker-location" dir="auto">
                  {locationText(bookmark)}
                </span>
              </button>
              <button
                type="button"
                className="sb-bookmark-picker-remove"
                disabled={isSaving.value}
                aria-label={t("remove-bookmark-named", {
                  defaultValue: "Remove {{name}}",
                  name: bookmark.name,
                })}
                title={t("remove-bookmark", {
                  defaultValue: "Remove bookmark",
                })}
                onClick={() => {
                  void handleRemove(bookmark.id);
                }}
              >
                <MaterialIcon aria-hidden="true">delete</MaterialIcon>
              </button>
            </div>
          );
        })}

        {effectiveDraft && (
          <div
            className={`sb-bookmark-picker-row sb-bookmark-picker-row-new${
              selected === NEW_BOOKMARK_ROW
                ? " sb-bookmark-picker-row-selected"
                : ""
            }`}
          >
            <button
              type="button"
              role="radio"
              aria-checked={selected === NEW_BOOKMARK_ROW}
              disabled={isSaving.value}
              className="sb-bookmark-picker-choice"
              onClick={() => {
                selectedId.value = NEW_BOOKMARK_ROW;
              }}
            >
              <BookmarkGlyph colorId={effectiveDraft.colorId} size={18} />
              <span className="sb-bookmark-picker-name">
                {t("new-bookmark", { defaultValue: "New bookmark" })}
              </span>
            </button>
            {draft.value && (
              <button
                type="button"
                className="sb-bookmark-picker-remove"
                disabled={isSaving.value}
                aria-label={t("discard-new-bookmark", {
                  defaultValue: "Discard new bookmark",
                })}
                title={t("discard-new-bookmark", {
                  defaultValue: "Discard new bookmark",
                })}
                onClick={() => {
                  draft.value = null;
                }}
              >
                <MaterialIcon aria-hidden="true">close</MaterialIcon>
              </button>
            )}
            <div className="sb-bookmark-picker-form">
              <BookmarkForm
                value={effectiveDraft}
                disabled={isSaving.value}
                onChange={(next) => {
                  draft.value = next;
                  selectedId.value = NEW_BOOKMARK_ROW;
                }}
                onSubmit={() => {
                  void handleSave();
                }}
              />
            </div>
          </div>
        )}
      </div>

      {!effectiveDraft && (
        <div className="sb-bookmark-picker-add">
          <button
            type="button"
            className="sb-bookmark-add-new"
            disabled={!canAddNew || isSaving.value}
            onClick={() => {
              draft.value = nextBookmarkDraft(t, bookmarks);
              selectedId.value = NEW_BOOKMARK_ROW;
            }}
          >
            <MaterialIcon aria-hidden="true">add</MaterialIcon>
            <span>{t("new-bookmark", { defaultValue: "New bookmark" })}</span>
          </button>
          {!manager.canCreate.value && <BookmarkCapNote />}
        </div>
      )}

      <div className="sb-bookmark-picker-actions">
        <button
          type="button"
          className="sb-bookmark-picker-save"
          disabled={!canSave}
          onClick={() => {
            void handleSave();
          }}
        >
          {isSaving.value
            ? t("saving", { defaultValue: "Saving…" })
            : t("save", { defaultValue: "Save" })}
        </button>
      </div>
    </div>
  );
}

/** Why "New bookmark" is disabled at the cap. */
function BookmarkCapNote() {
  const { t } = useI18n();
  return (
    <p className="sb-bookmark-cap-note">
      {t("bookmark-limit-reached", {
        defaultValue:
          "You can have up to {{max}} bookmarks. Move or remove one to make room.",
        max: MAX_BOOKMARKS,
      })}
    </p>
  );
}

/**
 * Opens the bookmark modal for a chapter. Signs the user in first if needed,
 * and waits for their stored bookmarks so the modal never offers the premade
 * "My bookmark" to someone whose bookmarks simply hadn't arrived yet.
 */
export async function openBookmarkModal(
  state: SeedBibleState,
  location: BookmarkLocation
): Promise<void> {
  const { login, bookmarks } = state;
  if (!login.userId.value) {
    await login.login();
    if (!login.userId.value) return;
  }
  if (!(await bookmarks.ensureLoaded())) {
    const { t } = state.i18n;
    state.app.toast(
      t("bookmarks-load-failed", {
        defaultValue: "Couldn't load your bookmarks. Please try again.",
      })
    );
    return;
  }
  const modalId = `bookmark-${location.translationId}-${location.bookId}-${location.chapterNumber}`;
  state.modals.openModal({
    id: modalId,
    title: { key: "bookmark-chapter", defaultValue: "Bookmark chapter" },
    content: () => (
      <BookmarkPickerContent
        state={state}
        location={location}
        onClose={() => state.modals.closeModal(modalId)}
      />
    ),
  });
}

/** The chapter the selected tab is reading, if it has loaded one. */
function currentReaderLocation(state: SeedBibleState): BookmarkLocation | null {
  const tab = state.tabs.tabs.value.find(
    (candidate) => candidate.id === state.tabs.selectedTabId.value
  );
  const translationId = tab?.readingState.translationId.value;
  const bookId = tab?.readingState.bookId.value;
  const chapterNumber = tab?.readingState.chapterNumber.value;
  if (!translationId || !bookId || !chapterNumber) return null;
  return { translationId, bookId, chapterNumber };
}

/**
 * The sidebar's bookmarks panel: every bookmark, most recently moved first,
 * where each can be opened, renamed, recolored, or deleted, and a new one can
 * be placed on the chapter being read.
 */
export function BookmarksPanel(props: {
  state: SeedBibleState;
  closeLayoutMenu: () => void;
}) {
  const { state, closeLayoutMenu } = props;
  const { bookmarks: manager } = state;
  const { t } = useI18n();
  const locationText = useBookmarkLocationText(state);

  const bookmarks = manager.bookmarks.value;
  /** Which bookmark is being edited, or the create form's row id. */
  const editingId = useSignal<string | null>(null);
  const editValue = useSignal<BookmarkDetails>({
    name: "",
    colorId: DEFAULT_BOOKMARK_COLOR_ID,
  });
  const isSaving = useSignal(false);

  const currentLocation = currentReaderLocation(state);
  const isCreating = editingId.value === NEW_BOOKMARK_ROW;

  const startEditing = (id: string, value: BookmarkDetails) => {
    editingId.value = id;
    editValue.value = value;
  };

  const stopEditing = () => {
    editingId.value = null;
  };

  const run = async (action: () => Promise<unknown>) => {
    if (isSaving.value) return;
    isSaving.value = true;
    try {
      await action();
      stopEditing();
    } catch (err) {
      console.warn("Failed to update bookmarks:", err);
      state.app.toast(
        t("bookmark-save-failed", {
          defaultValue: "Couldn't save your bookmark. Please try again.",
        })
      );
    } finally {
      isSaving.value = false;
    }
  };

  const submitEdit = () => {
    const id = editingId.value;
    const value = editValue.value;
    if (!id || value.name.trim() === "") return;
    if (id === NEW_BOOKMARK_ROW) {
      if (!currentLocation) return;
      void run(() => manager.createBookmark(value, currentLocation));
    } else {
      void run(() => manager.updateBookmark(id, value));
    }
  };

  const editActions = (
    <div className="sb-bookmarks-panel-edit-actions">
      <button
        type="button"
        className="sb-bookmarks-panel-cancel"
        disabled={isSaving.value}
        onClick={stopEditing}
      >
        {t("cancel", { defaultValue: "Cancel" })}
      </button>
      <button
        type="button"
        className="sb-bookmark-picker-save"
        disabled={isSaving.value || editValue.value.name.trim() === ""}
        onClick={submitEdit}
      >
        {isSaving.value
          ? t("saving", { defaultValue: "Saving…" })
          : t("save", { defaultValue: "Save" })}
      </button>
    </div>
  );

  return (
    <div className="sb-bookmarks-panel">
      {bookmarks.length === 0 && !isCreating && (
        <p className="sb-bookmarks-panel-empty">
          {t("bookmarks-empty", {
            defaultValue:
              "No bookmarks yet. Use the bookmark button above a chapter to place one.",
          })}
        </p>
      )}

      {bookmarks.map((bookmark) =>
        editingId.value === bookmark.id ? (
          <div key={bookmark.id} className="sb-bookmarks-panel-editor">
            <BookmarkForm
              value={editValue.value}
              autoFocus
              disabled={isSaving.value}
              onChange={(next) => {
                editValue.value = next;
              }}
              onSubmit={submitEdit}
            />
            {editActions}
          </div>
        ) : (
          <div key={bookmark.id} className="sb-bookmarks-panel-row">
            <button
              type="button"
              className="sb-bookmarks-panel-open"
              onClick={() => {
                openReaderLocation(state, bookmark, closeLayoutMenu);
              }}
            >
              <BookmarkGlyph colorId={bookmark.colorId} size={16} />
              <span className="sb-bookmarks-panel-name">{bookmark.name}</span>
              <span className="sb-bookmarks-panel-location" dir="auto">
                {locationText(bookmark)}
                <span aria-hidden="true"> • </span>
                {bookmark.translationId}
              </span>
            </button>
            <button
              type="button"
              className="sb-bookmarks-panel-icon-button"
              disabled={isSaving.value}
              aria-label={t("edit-bookmark-named", {
                defaultValue: "Edit {{name}}",
                name: bookmark.name,
              })}
              title={t("edit-bookmark", { defaultValue: "Edit bookmark" })}
              onClick={() => {
                startEditing(bookmark.id, {
                  name: bookmark.name,
                  colorId: bookmark.colorId,
                });
              }}
            >
              <MaterialIcon aria-hidden="true">edit</MaterialIcon>
            </button>
            <button
              type="button"
              className="sb-bookmarks-panel-icon-button"
              disabled={isSaving.value}
              aria-label={t("remove-bookmark-named", {
                defaultValue: "Remove {{name}}",
                name: bookmark.name,
              })}
              title={t("remove-bookmark", {
                defaultValue: "Remove bookmark",
              })}
              onClick={() => {
                void run(() => manager.removeBookmark(bookmark.id));
              }}
            >
              <MaterialIcon aria-hidden="true">delete</MaterialIcon>
            </button>
          </div>
        )
      )}

      {isCreating && currentLocation ? (
        <div className="sb-bookmarks-panel-editor">
          <p className="sb-bookmarks-panel-editor-title">
            {t("new-bookmark-at", {
              defaultValue: "New bookmark at {{location}}",
              location: locationText(currentLocation),
            })}
          </p>
          <BookmarkForm
            value={editValue.value}
            autoFocus
            disabled={isSaving.value}
            onChange={(next) => {
              editValue.value = next;
            }}
            onSubmit={submitEdit}
          />
          {editActions}
        </div>
      ) : (
        <div className="sb-bookmark-picker-add">
          <button
            type="button"
            className="sb-bookmark-add-new"
            disabled={
              !manager.canCreate.value || !currentLocation || isSaving.value
            }
            onClick={() => {
              startEditing(NEW_BOOKMARK_ROW, nextBookmarkDraft(t, bookmarks));
            }}
          >
            <MaterialIcon aria-hidden="true">add</MaterialIcon>
            <span>{t("new-bookmark", { defaultValue: "New bookmark" })}</span>
          </button>
          {!manager.canCreate.value && <BookmarkCapNote />}
        </div>
      )}
    </div>
  );
}
