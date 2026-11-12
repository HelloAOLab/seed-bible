import "./Bookmarks.css";
import { signal, useSignal, type Signal } from "@preact/signals";
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
import { openConfirmDeleteModal } from "../ConfirmDeleteModal/ConfirmDeleteModal";

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
 * would read as the save button beside it.
 *
 * The offsets center the group by its visible outline, tilt included, in the
 * 24×24 box. Centering the untilted ribbons instead left a full fan of three
 * hanging off the right edge of its button.
 */
const STACK_LAYOUTS: Record<number, { x: number; y: number }[]> = {
  2: [
    { x: -2.11, y: 0.94 },
    { x: 1.39, y: 0.44 },
  ],
  3: [
    { x: -5.08, y: 0.65 },
    { x: -1.58, y: 0.15 },
    { x: 1.92, y: -0.35 },
  ],
};
const STACK_SCALE = 0.92;
/** Degrees each ribbon behind the front one turns, about its bottom center. */
const STACK_TILT = 12;

/** ViewBox size; stroke widths are in these units so 1 screen px = 24 / size. */
const BOOKMARK_VIEWBOX = 24;
/**
 * Fattens the single-ribbon glyph. Half of this sits outside the bare path and
 * defines the visible edge the inside outline is measured from.
 */
const BOOKMARK_EDGE_STROKE = 1.5;

/** Safe fragment for SVG url(#…) ids from Preact's useId(). */
function svgIdFragment(id: string): string {
  return id.replace(/[^\w-]/g, "");
}

/** 135° fill stops: 5% toward white (top-left) and black (bottom-right). */
function bookmarkFillStops(color: string): { start: string; end: string } {
  return {
    start: `color-mix(in srgb, ${color} 95%, white)`,
    end: `color-mix(in srgb, ${color} 95%, black)`,
  };
}

/**
 * Outline base: the bookmark color shifted 35% toward the theme text color
 * (darker in light mode, lighter in dark mode).
 */
function bookmarkOutlineBase(color: string): string {
  return `color-mix(in srgb, ${color} 65%, var(--sb-font-color))`;
}

/** Same 135° treatment as the fill, on top of the outline base color. */
function bookmarkOutlineStops(color: string): { start: string; end: string } {
  return bookmarkFillStops(bookmarkOutlineBase(color));
}

/**
 * Gradient defs shared by a filled ribbon: fill + outline at 135° in local
 * viewBox space so a stacked ribbon's transform carries the gradient with it.
 */
function BookmarkRibbonGradients(props: {
  fillId: string;
  outlineId: string;
  color: string;
}) {
  const fill = bookmarkFillStops(props.color);
  const outline = bookmarkOutlineStops(props.color);
  return (
    <>
      <linearGradient
        id={props.fillId}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1="0"
        x2={BOOKMARK_VIEWBOX}
        y2={BOOKMARK_VIEWBOX}
      >
        <stop offset="0%" stop-color={fill.start} />
        <stop offset="100%" stop-color={fill.end} />
      </linearGradient>
      <linearGradient
        id={props.outlineId}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1="0"
        x2={BOOKMARK_VIEWBOX}
        y2={BOOKMARK_VIEWBOX}
      >
        <stop offset="0%" stop-color={outline.start} />
        <stop offset="100%" stop-color={outline.end} />
      </linearGradient>
    </>
  );
}

/**
 * A single bookmark ribbon filled in a bookmark color, with the shared 1px
 * inside outline and 135° gradient. Pass `color="currentColor"` (Tabs toggle
 * when open) to keep the flat primary-color style from #2039.
 */
export function BookmarkGlyph(props: {
  colorId: string;
  size?: number;
  className?: string;
  /** Paints the ribbon in this CSS color instead of the bookmark's own. */
  color?: string;
}) {
  const size = props.size ?? 16;
  const color = props.color ?? bookmarkColorValue(props.colorId);
  const flat = color === "currentColor";
  const uid = svgIdFragment(useId());
  const fillGradId = `sb-bm-fill-${uid}`;
  const outlineGradId = `sb-bm-out-${uid}`;
  const insetFilterId = `sb-bm-inset-${uid}`;
  const insetMaskId = `sb-bm-inset-mask-${uid}`;
  // 1 screen px in viewBox units at this display size.
  const outlineUnits = BOOKMARK_VIEWBOX / size;

  if (flat) {
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
          stroke-width={BOOKMARK_EDGE_STROKE}
          stroke-linejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      className={`sb-bookmark-glyph${props.className ? ` ${props.className}` : ""}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      data-bookmark-color={props.colorId}
    >
      <defs>
        <BookmarkRibbonGradients
          fillId={fillGradId}
          outlineId={outlineGradId}
          color={color}
        />
        {/* Shrink the visible glyph (path + edge stroke) by 1 screen px so the
            outline ring is measured from that edge, not the bare path. */}
        <filter
          id={insetFilterId}
          filterUnits="userSpaceOnUse"
          primitiveUnits="userSpaceOnUse"
          x="-6"
          y="-6"
          width="36"
          height="36"
        >
          <feMorphology
            in="SourceAlpha"
            operator="erode"
            radius={outlineUnits}
            result="eroded"
          />
          <feFlood flood-color="white" result="white" />
          <feComposite in="white" in2="eroded" operator="in" />
        </filter>
        <mask
          id={insetMaskId}
          maskUnits="userSpaceOnUse"
          x="-6"
          y="-6"
          width="36"
          height="36"
        >
          <g filter={`url(#${insetFilterId})`}>
            <path
              d={BOOKMARK_PATH}
              fill="white"
              stroke="white"
              stroke-width={BOOKMARK_EDGE_STROKE}
              stroke-linejoin="round"
            />
          </g>
        </mask>
      </defs>
      {/* Outline-colored full glyph; fill layer covers all but the outer 1px. */}
      <path
        d={BOOKMARK_PATH}
        fill={`url(#${outlineGradId})`}
        stroke={`url(#${outlineGradId})`}
        stroke-width={BOOKMARK_EDGE_STROKE}
        stroke-linejoin="round"
      />
      <path
        className="sb-bookmark-glyph-fill"
        d={BOOKMARK_PATH}
        fill={`url(#${fillGradId})`}
        stroke={`url(#${fillGradId})`}
        stroke-width={BOOKMARK_EDGE_STROKE}
        stroke-linejoin="round"
        mask={`url(#${insetMaskId})`}
      />
    </svg>
  );
}

/**
 * An unfilled ribbon in the text color. `scale` is the size the ribbon is
 * drawn at; the stroke is widened to undo it, so a shrunk ribbon in a stack
 * is outlined as heavily as a lone one.
 */
function outlinePaint(scale = 1) {
  return {
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 1.5 / scale,
    "stroke-linejoin": "round",
  } as const;
}

/**
 * A bookmark icon for a list of bookmarks, most recently moved first: an
 * outline when there are none, a filled ribbon for one, and a fan of up to
 * three ribbons — the most recently moved in front — for more.
 *
 * Each ribbon is filled in its bookmark's color unless `paint` says
 * otherwise: "outline" draws every ribbon as an unfilled outline in the text
 * color (so one bookmark looks the same as none), and "current" fills every
 * ribbon in the text color.
 */
export function BookmarkStackIcon(props: {
  bookmarks: readonly Bookmark[];
  size?: number;
  /** For a toggle: "outline" while it is off, "current" while it is on. */
  paint?: "outline" | "current";
}) {
  const size = props.size ?? 22;
  const shown = props.bookmarks.slice(0, MAX_STACKED_GLYPHS);
  // Mask / gradient ids must be unique on the page, and usable inside `url(#…)`.
  const idPrefix = `sb-bookmark-stack-${svgIdFragment(useId())}`;
  const flatPaint = props.paint === "outline" || props.paint === "current";
  const fillColor = (bookmark: Bookmark) =>
    props.paint === "current"
      ? "currentColor"
      : bookmarkColorValue(bookmark.colorId);

  if (shown.length === 0 || (props.paint === "outline" && shown.length === 1)) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path d={BOOKMARK_PATH} {...outlinePaint()} />
      </svg>
    );
  }

  if (shown.length === 1) {
    return (
      <BookmarkGlyph
        colorId={shown[0]!.colorId}
        size={size}
        color={fillColor(shown[0]!)}
      />
    );
  }

  const layout = STACK_LAYOUTS[shown.length]!;
  // Stroke widths on a scaled ribbon are scaled with it; inflate so the
  // clipped half still reads as 1 screen px after STACK_SCALE.
  const outlineStroke = (2 * BOOKMARK_VIEWBOX) / (size * STACK_SCALE);
  const ribbons = shown.map((bookmark, index) => {
    const offset = layout[index]!;
    return {
      bookmark,
      maskId: `${idPrefix}-gap-${index}`,
      clipId: `${idPrefix}-clip-${index}`,
      fillGradId: `${idPrefix}-fill-${index}`,
      outlineGradId: `${idPrefix}-out-${index}`,
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
        {!flatPaint &&
          ribbons.map((ribbon) => (
            <g key={ribbon.fillGradId}>
              <BookmarkRibbonGradients
                fillId={ribbon.fillGradId}
                outlineId={ribbon.outlineGradId}
                color={fillColor(ribbon.bookmark)}
              />
              {/* Clip the double-width outline stroke to the ribbon fill so only
                  the inside half (1 screen px) shows — size stays the same. */}
              <clipPath id={ribbon.clipId} clipPathUnits="userSpaceOnUse">
                <path d={BOOKMARK_PATH} transform={ribbon.transform} />
              </clipPath>
            </g>
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
          {props.paint === "outline" ? (
            <path
              className="sb-bookmark-stack-ribbon"
              d={BOOKMARK_PATH}
              transform={ribbon.transform}
              {...outlinePaint(STACK_SCALE)}
            />
          ) : flatPaint ? (
            <path
              className="sb-bookmark-stack-ribbon"
              d={BOOKMARK_PATH}
              transform={ribbon.transform}
              fill={fillColor(ribbon.bookmark)}
            />
          ) : (
            <>
              <path
                className="sb-bookmark-stack-ribbon"
                d={BOOKMARK_PATH}
                transform={ribbon.transform}
                fill={`url(#${ribbon.fillGradId})`}
                data-bookmark-color={ribbon.bookmark.colorId}
              />
              {/* Clip on an untransformed group so the path's own transform
                  isn't applied a second time against the clip region. */}
              <g clip-path={`url(#${ribbon.clipId})`}>
                <path
                  d={BOOKMARK_PATH}
                  transform={ribbon.transform}
                  fill="none"
                  stroke={`url(#${ribbon.outlineGradId})`}
                  stroke-width={outlineStroke}
                  stroke-linejoin="round"
                />
              </g>
            </>
          )}
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

const BOOKMARK_COLOR_LABEL_DEFAULTS: Record<BookmarkColorId, string> = {
  orange: "Orange",
  red: "Red",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  purple: "Purple",
  black: "Black",
  gray: "Gray",
  white: "White",
};

function bookmarkColorLabel(t: Translate, colorId: BookmarkColorId): string {
  return t(`bookmark-color-${colorId}`, {
    defaultValue: BOOKMARK_COLOR_LABEL_DEFAULTS[colorId],
  });
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
export function useBookmarkLocationText(state: SeedBibleState) {
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
 * and closes the modal; its options menu opens the chapter it is on now, or
 * deletes it.
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
  const run = async (action: () => Promise<unknown>, failure: string) => {
    if (isSaving.value) return;
    isSaving.value = true;
    try {
      await action();
      onClose();
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
    run(() => manager.moveBookmark(id, location), saveFailed);

  const createHere = () => {
    if (!canCreate || !effectiveDraft) return;
    void run(async () => {
      const created = await manager.createBookmark(effectiveDraft, location);
      if (!created) {
        throw new Error("The bookmark was not created.");
      }
    }, saveFailed);
  };

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
            <ContextMenuWithButton
              anchorClassName="sb-tab-menu-anchor sb-bookmark-picker-menu-anchor"
              buttonClassName="sb-tab-menu-button"
              menuClassName="sb-tab-menu sb-bookmark-picker-menu"
              iconClassName="sb-tab-more-icon"
              disabled={isSaving.value}
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
                  openReaderLocation(state, bookmark, onClose);
                }}
              >
                <MaterialIcon
                  className="sb-context-menu-item-icon"
                  aria-hidden="true"
                >
                  menu_book
                </MaterialIcon>
                <span>
                  {t("open-chapter", { defaultValue: "Open chapter" })}
                </span>
              </ContextMenuItem>
              <ContextMenuItem
                className="sb-tab-menu-item"
                onClick={() => {
                  confirmDeleteBookmark(state, bookmark);
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

/**
 * Asks before deleting a bookmark, since Delete sits one slip away from the
 * other items in a bookmark's options menu. Whatever the menu was in stays
 * open behind the question, showing the bookmarks that are left.
 */
export function confirmDeleteBookmark(
  state: SeedBibleState,
  bookmark: Bookmark
) {
  openConfirmDeleteModal(state.modals, {
    id: `delete-bookmark-confirm-${bookmark.id}`,
    title: {
      key: "delete-bookmark-confirm-title",
      defaultValue: "Delete bookmark?",
    },
    message: (t) =>
      `${t("delete-bookmark-confirm-message", {
        name: bookmark.name,
        defaultValue: 'Delete "{{name}}"?',
      })} ${t("cant-be-undone", { defaultValue: "This can't be undone." })}`,
    onConfirm: () => state.bookmarks.removeBookmark(bookmark.id),
    failedMessage: (t) =>
      t("bookmark-remove-failed", {
        defaultValue: "Couldn't remove that bookmark. Please try again.",
      }),
    toast: state.app.toast,
  });
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
    mobileSheet: true,
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
 * Renames or recolors one bookmark: its name and color fields with Cancel and
 * Save. `onDone` runs on Cancel and after a successful save; a failed save
 * stays open with a toast so nothing typed is lost.
 */
function BookmarkEditor(props: {
  state: SeedBibleState;
  bookmark: Bookmark;
  /**
   * True while a save is in flight. Owned by the caller so the modal around
   * the editor can refuse to close mid-save.
   */
  isSaving: Signal<boolean>;
  onDone: () => void;
}) {
  const { state, bookmark, isSaving, onDone } = props;
  const { t } = useI18n();
  const value = useSignal<BookmarkDetails>({
    name: bookmark.name,
    colorId: bookmark.colorId,
  });

  const submit = async () => {
    if (isSaving.value || value.value.name.trim() === "") return;
    isSaving.value = true;
    try {
      await state.bookmarks.updateBookmark(bookmark.id, value.value);
      onDone();
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

  return (
    <div className="sb-bookmark-edit">
      <BookmarkForm
        value={value.value}
        autoFocus
        disabled={isSaving.value}
        onChange={(next) => {
          value.value = next;
        }}
        onSubmit={() => void submit()}
      />
      <div className="sb-bookmark-edit-actions">
        <button
          type="button"
          className="sb-bookmark-edit-cancel"
          disabled={isSaving.value}
          onClick={onDone}
        >
          {t("cancel", { defaultValue: "Cancel" })}
        </button>
        <button
          type="button"
          className="sb-bookmark-picker-save"
          disabled={isSaving.value || value.value.name.trim() === ""}
          onClick={() => void submit()}
        >
          {isSaving.value
            ? t("saving", { defaultValue: "Saving…" })
            : t("save", { defaultValue: "Save" })}
        </button>
      </div>
    </div>
  );
}

/**
 * Opens {@link BookmarkEditor} in a modal. The one place a bookmark is renamed
 * or recolored, from the sidebar panel and from Your content alike.
 */
export function openEditBookmarkModal(
  state: SeedBibleState,
  bookmark: Bookmark
): void {
  const modalId = `edit-bookmark-${bookmark.id}`;
  const isSaving = signal(false);
  const close = () => state.modals.closeModal(modalId);
  state.modals.openModal({
    id: modalId,
    title: { key: "edit-bookmark", defaultValue: "Edit bookmark" },
    mobileSheet: true,
    // Like Cancel: once Save is pressed, the modal stays until it settles, so
    // a failed save still has the typed name to retry with.
    canDismiss: () => !isSaving.value,
    content: () => (
      <BookmarkEditor
        state={state}
        bookmark={bookmark}
        isSaving={isSaving}
        onDone={close}
      />
    ),
  });
}

/**
 * The sidebar's bookmarks panel: every bookmark, most recently moved first.
 * Tapping one opens its chapter; its options menu renames and recolors it (in
 * the edit modal) or deletes it. Bookmarks are only placed from a chapter (the
 * reader's button), so there is no "new bookmark" here.
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

      {bookmarks.map((bookmark) => (
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
                openEditBookmarkModal(state, bookmark);
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
                confirmDeleteBookmark(state, bookmark);
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
      ))}
    </div>
  );
}
