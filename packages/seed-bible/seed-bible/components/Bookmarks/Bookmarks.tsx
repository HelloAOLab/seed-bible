import "./Bookmarks.css";
import { useSignal } from "@preact/signals";
import { useId } from "preact/hooks";
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
import {
  ContextMenuItem,
  ContextMenuWithButton,
} from "../ContextMenu/ContextMenu";
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
 * Where each ribbon of a stack sits, front first: stepped toward the inline
 * end and tilted a little further each time, so the copies behind fan out like
 * cards while every ribbon keeps its bookmark shape — an even stack of sheets
 * would read as the save button beside it. The group is centered in the 24×24
 * box; the tilt lets the last ribbon's tip spill just past it.
 */
const STACK_LAYOUTS: Record<number, { x: number; y: number }[]> = {
  2: [
    { x: -0.79, y: 1.21 },
    { x: 2.71, y: 0.71 },
  ],
  3: [
    { x: -2.54, y: 1.46 },
    { x: 0.96, y: 0.96 },
    { x: 4.46, y: 0.46 },
  ],
};
const STACK_SCALE = 0.92;
/** Degrees each ribbon behind the front one turns, about its bottom center. */
const STACK_TILT = 12;

/** A single bookmark ribbon filled in a bookmark color. */
export function BookmarkGlyph(props: {
  colorId: string;
  size?: number;
  className?: string;
  /** Paints the ribbon in this CSS color instead of the bookmark's own. */
  color?: string;
}) {
  const size = props.size ?? 16;
  const color = props.color ?? bookmarkColorValue(props.colorId);
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
  /** Paints every ribbon in this CSS color instead of each bookmark's own. */
  color?: string;
}) {
  const size = props.size ?? 22;
  const shown = props.bookmarks.slice(0, MAX_STACKED_GLYPHS);
  // Mask ids must be unique on the page, and usable inside `url(#…)`.
  const maskPrefix = `sb-bookmark-stack-${useId().replace(/[^\w-]/g, "")}`;

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
    return (
      <BookmarkGlyph
        colorId={shown[0]!.colorId}
        size={size}
        color={props.color}
      />
    );
  }

  const layout = STACK_LAYOUTS[shown.length]!;
  const ribbons = shown.map((bookmark, index) => {
    const offset = layout[index]!;
    return {
      bookmark,
      maskId: `${maskPrefix}-${index}`,
      transform: `translate(${offset.x} ${offset.y}) scale(${STACK_SCALE}) rotate(${index * STACK_TILT} 12 21)`,
    };
  });
  // Each ribbon behind the front one is masked by a slightly fattened copy of
  // every ribbon in front of it. That cuts a real gap — transparent, so it
  // reads on any background — rather than painting one in a color that would
  // only match some of the places the icon sits.
  return (
    <svg
      className="sb-bookmark-stack-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      overflow="visible"
      aria-hidden="true"
    >
      <defs>
        {ribbons.slice(1).map((ribbon, behind) => (
          <mask
            key={ribbon.maskId}
            id={ribbon.maskId}
            maskUnits="userSpaceOnUse"
            x="-6"
            y="-6"
            width="36"
            height="36"
          >
            <rect x="-6" y="-6" width="36" height="36" fill="white" />
            {ribbons.slice(0, behind + 1).map((front) => (
              <path
                key={front.maskId}
                d={BOOKMARK_PATH}
                transform={front.transform}
                fill="black"
                stroke="black"
                stroke-width="3.4"
                stroke-linejoin="round"
              />
            ))}
          </mask>
        ))}
      </defs>
      {/* Painted back to front so the most recently moved ribbon is on top. */}
      {/* The mask sits on an untransformed group: on the path itself it would
          be read in the ribbon's own tilted coordinates, transforming the
          shapes inside it a second time. */}
      {[...ribbons].reverse().map((ribbon, reversedIndex) => (
        <g
          key={ribbon.bookmark.id}
          mask={
            reversedIndex === ribbons.length - 1
              ? undefined
              : `url(#${ribbon.maskId})`
          }
        >
          <path
            className="sb-bookmark-stack-ribbon"
            d={BOOKMARK_PATH}
            transform={ribbon.transform}
            fill={props.color ?? bookmarkColorValue(ribbon.bookmark.colorId)}
          />
        </g>
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
 * Name and color for a bookmark about to be created: "My bookmark", or the
 * first of "My bookmark 2", "My bookmark 3"… that is free, and the first color
 * nobody is using yet, so a new bookmark is
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
    name = t("my-bookmark-numbered", {
      defaultValue: "My bookmark {{number}}",
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

/**
 * A bookmark's name over where it sits — "Genesis 3 • AAB" — on a second line,
 * so a long name and a long book name each get a line of their own. The
 * translation is always shown, since the same chapter in two translations is
 * two different places to come back to.
 */
export function BookmarkLabel(props: {
  name: string;
  chapterText: string;
  translationId: string;
}) {
  return (
    <span className="sb-bookmark-label">
      <span className="sb-bookmark-label-name">{props.name}</span>
      <span className="sb-bookmark-label-location">
        <span className="sb-bookmark-label-chapter" dir="auto">
          {props.chapterText}
        </span>
        <span className="sb-bookmark-label-sep" aria-hidden="true">
          •
        </span>
        <span className="sb-bookmark-label-translation">
          {props.translationId}
        </span>
      </span>
    </span>
  );
}

/**
 * The bookmark modal. Tapping one of your bookmarks moves it to `location`
 * and closes the modal.
 *
 * Below them, while one is being created, sits the create form with its own
 * Save. A user with no bookmarks gets that same form already open, prefilled
 * as "My bookmark", so their first bookmark goes through the same save path as
 * any other, and nothing is written until Save.
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
  const isSaving = useSignal(false);

  // With nothing to pick, the create form is offered without being asked for.
  const effectiveDraft =
    draft.value ??
    (bookmarks.length === 0 ? nextBookmarkDraft(t, bookmarks) : null);
  const canCreate =
    !isSaving.value && !!effectiveDraft && effectiveDraft.name.trim() !== "";
  const canAddNew = manager.canCreate.value && !effectiveDraft;

  /** Runs a write, closing on success and toasting `failure` otherwise. */
  const run = async (
    action: () => Promise<unknown>,
    failure: string,
    closeAfter: boolean
  ) => {
    if (isSaving.value) return;
    isSaving.value = true;
    try {
      await action();
      if (closeAfter) onClose();
    } catch (err) {
      console.warn("Failed to update bookmarks:", err);
      state.app.toast(failure);
    } finally {
      isSaving.value = false;
    }
  };

  const saveFailed = t("bookmark-save-failed", {
    defaultValue: "Couldn't save your bookmark. Please try again.",
  });

  const moveHere = (id: string) =>
    run(() => manager.moveBookmark(id, location), saveFailed, true);

  const createHere = () => {
    if (!canCreate || !effectiveDraft) return;
    void run(
      async () => {
        const created = await manager.createBookmark(effectiveDraft, location);
        if (!created) {
          throw new Error("The bookmark was not created.");
        }
      },
      saveFailed,
      true
    );
  };

  const remove = (id: string) =>
    run(
      () => manager.removeBookmark(id),
      t("bookmark-remove-failed", {
        defaultValue: "Couldn't remove that bookmark. Please try again.",
      }),
      false
    );

  return (
    <div className="sb-bookmark-picker">
      {bookmarks.length > 0 && (
        <p className="sb-bookmark-picker-hint">
          {t("bookmark-move-hint", {
            defaultValue: "Tap a bookmark to move it to this chapter.",
          })}
        </p>
      )}
      <div className="sb-bookmark-picker-list">
        {bookmarks.map((bookmark) => (
          <div key={bookmark.id} className="sb-bookmark-picker-row">
            <button
              type="button"
              disabled={isSaving.value}
              className="sb-bookmark-picker-choice"
              title={t("move-bookmark-here", {
                defaultValue: "Move {{name}} here",
                name: bookmark.name,
              })}
              onClick={() => {
                void moveHere(bookmark.id);
              }}
            >
              <BookmarkGlyph colorId={bookmark.colorId} size={18} />
              <BookmarkLabel
                name={bookmark.name}
                chapterText={locationText(bookmark)}
                translationId={bookmark.translationId}
              />
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
                void remove(bookmark.id);
              }}
            >
              <MaterialIcon aria-hidden="true">delete</MaterialIcon>
            </button>
          </div>
        ))}

        {effectiveDraft && (
          <div className="sb-bookmark-picker-row sb-bookmark-picker-row-new">
            <div className="sb-bookmark-picker-new-heading">
              <BookmarkGlyph colorId={effectiveDraft.colorId} size={18} />
              <span className="sb-bookmark-label-name">
                {t("new-bookmark", { defaultValue: "New bookmark" })}
              </span>
            </div>
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
                }}
                onSubmit={createHere}
              />
              <div className="sb-bookmark-picker-actions">
                <button
                  type="button"
                  className="sb-bookmark-picker-save"
                  disabled={!canCreate}
                  onClick={createHere}
                >
                  {isSaving.value
                    ? t("saving", { defaultValue: "Saving…" })
                    : t("save", { defaultValue: "Save" })}
                </button>
              </div>
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

/**
 * The sidebar's bookmarks panel: every bookmark, most recently moved first.
 * Tapping one opens its chapter; its options menu renames, recolors, or
 * deletes it. Bookmarks are only placed from a chapter (the reader's button),
 * so there is no "new bookmark" here.
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
  const editingId = useSignal<string | null>(null);
  const editValue = useSignal<BookmarkDetails>({
    name: "",
    colorId: DEFAULT_BOOKMARK_COLOR_ID,
  });
  const isSaving = useSignal(false);

  const run = async (action: () => Promise<unknown>) => {
    if (isSaving.value) return;
    isSaving.value = true;
    try {
      await action();
      editingId.value = null;
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
    void run(() => manager.updateBookmark(id, value));
  };

  return (
    <div className="sb-bookmarks-panel">
      {bookmarks.length === 0 && (
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
            <div className="sb-bookmarks-panel-edit-actions">
              <button
                type="button"
                className="sb-bookmarks-panel-cancel"
                disabled={isSaving.value}
                onClick={() => {
                  editingId.value = null;
                }}
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
              <BookmarkLabel
                name={bookmark.name}
                chapterText={locationText(bookmark)}
                translationId={bookmark.translationId}
              />
            </button>
            <ContextMenuWithButton
              anchorClassName="sb-tab-menu-anchor"
              buttonClassName="sb-tab-menu-button"
              menuClassName="sb-tab-menu"
              iconClassName="sb-tab-more-icon"
              aria-label={t("bookmark-options-named", {
                defaultValue: "Options for {{name}}",
                name: bookmark.name,
              })}
              title={t("bookmark-options", {
                defaultValue: "Bookmark options",
              })}
            >
              <ContextMenuItem
                className="sb-tab-menu-item"
                onClick={() => {
                  editingId.value = bookmark.id;
                  editValue.value = {
                    name: bookmark.name,
                    colorId: bookmark.colorId,
                  };
                }}
              >
                <MaterialIcon
                  className="sb-context-menu-item-icon"
                  aria-hidden="true"
                >
                  edit
                </MaterialIcon>
                <span>
                  {t("edit-bookmark", { defaultValue: "Edit bookmark" })}
                </span>
              </ContextMenuItem>
              <ContextMenuItem
                className="sb-tab-menu-item"
                onClick={() => {
                  void run(() => manager.removeBookmark(bookmark.id));
                }}
              >
                <MaterialIcon
                  className="sb-context-menu-item-icon"
                  aria-hidden="true"
                >
                  delete
                </MaterialIcon>
                <span>
                  {t("delete-bookmark", { defaultValue: "Delete bookmark" })}
                </span>
              </ContextMenuItem>
            </ContextMenuWithButton>
          </div>
        )
      )}
    </div>
  );
}
