import "./DiscoverPane.css";
import { effect, useSignal } from "@preact/signals";
import { lazy, Suspense } from "preact/compat";
import { useEffect, useRef } from "preact/hooks";
import type { JSX } from "preact";
import { useI18n } from "../../i18n/I18nManager";
import type { TabsManager, ReaderTab } from "../../managers/TabsManager";
import type { DiscoverManager } from "../../managers/DiscoverManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { LoginManager } from "../../managers/LoginManager";
import {
  annotationCollection,
  annotationVerseNumbers,
  annotationListHasOtherAuthors,
  formatAnnotationVerseNumbers,
  groupAnnotationsByVerseRange,
  type Annotation,
  type AnnotationGroup,
  type AnnotationsManager,
} from "../../managers/AnnotationsManager";
import { setSafeHtml } from "../../managers/Sanitization";
import { getUserAnimalVisual } from "../../managers/SessionsManager";
import { MaterialIcon } from "../icons";
import {
  ContextMenuWithButton,
  ContextMenuItem,
} from "../ContextMenu/ContextMenu";
import { DiscoverSection, DiscoverEmpty } from "./DiscoverSection";
import { noTabHint } from "./DiscoveredResultsSections";
import { Avatar } from "../Avatar/Avatar";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { emphasizeVerses, type PanesManager } from "../../managers";
import {
  parseVerseReference,
  type BookId,
  type VerseRef,
} from "../../managers/BibleDataManager";

// Loaded lazily so its (and its CSS's) bundle is only fetched for the rare
// visitor who actually has a `recordOverride` active - see
// `AnnotationOverrideBanner`.
const AnnotationOverrideBanner = lazy(
  () => import("./AnnotationOverrideBanner")
);

/** How long a just-jumped-to annotation group stays flashed (see
 * `AnnotationsSection`'s `highlightedGroupKey`). Matches the CSS fade in
 * DiscoverPane.css's `.sb-annotation-group--highlighted` rule. */
const HIGHLIGHT_DURATION_MS = 2000;

/**
 * Resolves the display name of the book an annotation targets, using
 * whichever open tab currently has that chapter loaded. Falls back to the
 * raw book id when no open tab has it loaded (e.g. a note for a chapter no
 * longer open).
 */
function annotationBookName(
  annotation: Pick<Annotation, "bookId" | "chapterNumber">,
  tabs: TabsManager
): string {
  const chapter = tabs.tabs.value
    .map((tab) => tab.readingState.chapterData.value)
    .find(
      (c) =>
        c?.book.id === annotation.bookId &&
        c?.chapter.number === annotation.chapterNumber
    );
  return chapter?.book.name ?? chapter?.book.commonName ?? annotation.bookId;
}

/** Formats an annotation's book/chapter/verse targeting, e.g. "Genesis 3:3-5,7". */
export function annotationLocationLabel(
  annotation: Annotation,
  tabs: TabsManager
): string {
  const book = annotationBookName(annotation, tabs);
  const base = `${book} ${annotation.chapterNumber}`;
  const verseNumbers = annotationVerseNumbers(annotation);
  if (verseNumbers.length === 0) {
    return base;
  }
  return `${base}:${formatAnnotationVerseNumbers(verseNumbers)}`;
}

/** Renders an annotation's sanitized HTML body as a preview snippet. */
export function AnnotationPreview({
  html,
  onReferenceClick,
}: {
  html: string;
  onReferenceClick?: (ref: VerseRef) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      void setSafeHtml(html, ref.current);
    }
  }, [html]);

  const handleClick = (event: JSX.TargetedMouseEvent<HTMLSpanElement>) => {
    if (!onReferenceClick) {
      return;
    }
    const anchor = (event.target as HTMLElement).closest?.(
      "a.sb-verse-reference-link"
    );
    if (!anchor) {
      return;
    }
    const parsed = parseVerseReference(anchor.textContent ?? "");
    if (!parsed) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    onReferenceClick(parsed);
  };

  return (
    <span
      ref={ref}
      className="sb-annotation-item-preview"
      dir="auto"
      onClick={handleClick}
    />
  );
}

// Shared across every `AnnotationAuthor` instance so authors of multiple
// comments (or comments re-rendered across chapters) resolve their profile
// once per session instead of once per row. `LoginManager.getUserProfile`
// has no built-in cache of its own for arbitrary user ids (only for the
// signed-in account), so this mirrors the per-id cache already used in
// `SessionsManager.tsx`.
const annotationAuthorProfileCache = new Map<
  string,
  ReturnType<LoginManager["getUserProfile"]>
>();

/**
 * Shows a comment annotation's author avatar and name, resolved live from
 * their profile by user id.
 */
function AnnotationAuthor(props: {
  userId: string | null | undefined;
  login: LoginManager;
  otherPeoplePresent?: boolean;
}) {
  const { userId, login, otherPeoplePresent = false } = props;
  const name = useSignal("");
  const pictureUrl = useSignal<string | null>(null);
  const isSelf = userId === login.userId.value;
  const { t } = useI18n();

  useEffect(() => {
    if (!userId) {
      return;
    }
    let cancelled = false;
    let promise = annotationAuthorProfileCache.get(userId);
    if (!promise) {
      promise = login.getUserProfile(userId);
      annotationAuthorProfileCache.set(userId, promise);
    }
    promise
      .then((profile) => {
        if (cancelled) {
          return;
        }
        if (profile.name) {
          name.value = profile.name;
        }
        if (profile.pictureUrl) {
          pictureUrl.value = profile.pictureUrl;
        }
      })
      .catch(() => {
        // No profile available; author renders with no name/picture.
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) {
    return null;
  }

  return (
    <span className="sb-annotation-comment-author">
      <Avatar
        imageUrl={pictureUrl.value}
        visual={getUserAnimalVisual(userId)}
        title={name.value}
        genericFallback={isSelf && !otherPeoplePresent}
      />
      {isSelf || name.value ? (
        <span className="sb-annotation-comment-author-name">
          {isSelf ? t("you", { defaultValue: "You" }) : name.value}
        </span>
      ) : null}
    </span>
  );
}

const annotationUpdatedTimeFormatterCache = new Map<
  string,
  Intl.DateTimeFormat
>();

export function getAnnotationUpdatedTimeFormatter(
  language: string
): Intl.DateTimeFormat {
  let formatter = annotationUpdatedTimeFormatterCache.get(language);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(language, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    annotationUpdatedTimeFormatterCache.set(language, formatter);
  }
  return formatter;
}

/** A comment annotation's author name plus its last-updated time. */
export function AnnotationCommentMeta(props: {
  annotation: Annotation;
  login: LoginManager;
  t: ReturnType<typeof useI18n>["t"];
  language: string;
  otherPeoplePresent?: boolean;
}) {
  const { annotation, login, language, otherPeoplePresent } = props;
  if (annotation.data.type !== "comment") {
    return null;
  }

  const updatedAtMs =
    annotation.data.updatedAtMs ?? annotation.data.createdAtMs;

  return (
    <span className="sb-annotation-comment-meta">
      <AnnotationAuthor
        userId={annotation.data.userId}
        login={login}
        otherPeoplePresent={otherPeoplePresent}
      />
      {updatedAtMs != null ? (
        <span className="sb-annotation-comment-updated">
          |{" "}
          {getAnnotationUpdatedTimeFormatter(language).format(
            new Date(updatedAtMs)
          )}
        </span>
      ) : null}
    </span>
  );
}

/**
 * One verse-range group of annotations: a collapsible header showing the
 * shared verse label, and (while expanded) the annotation rows themselves.
 * Starts expanded.
 */
function AnnotationGroupSection(props: {
  id: string;
  group: AnnotationGroup;
  annotations: AnnotationsManager;
  modals: ModalManager;
  toast: SeedBibleState["app"]["toast"];
  login: LoginManager;
  tabs: TabsManager;
  panes: PanesManager;
  onReferenceClick?: (ref: VerseRef) => void;
  otherPeoplePresent?: boolean;
  /** True while this group is the target of a just-clicked annotated verse
   * number (see `AnnotationsSection`'s `scrollToVerse` effect) — briefly
   * flashes a highlight so the reader can find the note it jumped to. */
  highlighted?: boolean;
}) {
  const {
    id,
    group,
    annotations,
    modals,
    toast,
    login,
    tabs,
    panes,
    onReferenceClick,
    otherPeoplePresent,
    highlighted,
  } = props;
  const { t, language } = useI18n();
  const expanded = useSignal(true);
  const label = annotationLocationLabel(group.annotations[0]!, tabs);

  return (
    <div
      className={`sb-annotation-group${
        highlighted ? " sb-annotation-group--highlighted" : ""
      }`}
      id={id}
    >
      <button
        type="button"
        className="sb-annotation-group-header"
        aria-expanded={expanded.value}
        aria-label={
          expanded.value
            ? t("annotation-group-collapse", {
                defaultValue: "Collapse group",
              })
            : t("annotation-group-expand", { defaultValue: "Expand group" })
        }
        onClick={() => (expanded.value = !expanded.value)}
      >
        <span className="sb-annotation-group-header-title">{label}</span>
        <MaterialIcon
          className={`sb-annotation-group-header-icon${
            expanded.value ? "" : " sb-annotation-group-header-icon--collapsed"
          }`}
        >
          expand_more
        </MaterialIcon>
      </button>
      {expanded.value ? (
        <ul className="sb-annotation-group-list">
          {group.annotations.map((annotation) => (
            <li
              key={annotation.id}
              className="sb-annotation-item"
              dir="auto"
              onClick={async () => {
                if (!annotation.verseNumber) {
                  return;
                }
                const tab = tabs.tabs.value.find(
                  (t) => t.id === tabs.selectedTabId.value
                );
                if (!tab) {
                  return;
                }

                panes.closeFullscreenPanes();
                // `translationId` is optional on the item; fall back to the tab's current
                // translation. `.peek()` avoids re-navigating when the tab changes it.
                await tab.readingState.selectTranslationAndChapter(
                  tab.readingState.translationId.peek(),
                  annotation.bookId,
                  annotation.chapterNumber,
                  { scrollToVerse: annotation.verseNumber }
                );

                emphasizeVerses(
                  tab.readingState,
                  {
                    book: annotation.bookId as BookId,
                    chapter: annotation.chapterNumber,
                    verse: annotation.verseNumber,
                    endVerse: annotation.endVerseNumber ?? undefined,
                  },
                  annotationVerseNumbers(annotation)
                );
              }}
            >
              <div className="sb-annotation-item-main">
                <AnnotationPreview
                  html={annotation.data.html}
                  onReferenceClick={onReferenceClick}
                />
                <AnnotationCommentMeta
                  annotation={annotation}
                  login={login}
                  t={t}
                  language={language}
                  otherPeoplePresent={otherPeoplePresent}
                />
              </div>
              <ContextMenuWithButton
                buttonClassName="sb-annotation-item-menu"
                aria-label={t("annotation-options", {
                  defaultValue: "Annotation options",
                })}
                onClick={(e) => e.stopPropagation()}
              >
                <ContextMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    annotations.editAnnotation(annotation);
                  }}
                >
                  <MaterialIcon className="sb-context-menu-item-icon">
                    edit
                  </MaterialIcon>
                  {t("edit-annotation", { defaultValue: "Edit" })}
                </ContextMenuItem>
                <ContextMenuItem
                  className="sb-context-menu-item--danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeleteAnnotationConfirm(
                      modals,
                      annotations,
                      annotation,
                      toast
                    );
                  }}
                >
                  <MaterialIcon className="sb-context-menu-item-icon">
                    delete
                  </MaterialIcon>
                  {t("delete-annotation", { defaultValue: "Delete" })}
                </ContextMenuItem>
              </ContextMenuWithButton>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function AnnotationsSection(props: {
  tab: ReaderTab | null;
  annotations: AnnotationsManager;
  modals: ModalManager;
  toast: SeedBibleState["app"]["toast"];
  login: LoginManager;
  tabs: TabsManager;
  discover: DiscoverManager;
  panes: PanesManager;
  onReferenceClick?: (ref: VerseRef) => void;
}) {
  const {
    tab,
    annotations,
    modals,
    toast,
    login,
    tabs,
    discover,
    panes,
    onReferenceClick,
  } = props;
  const { t } = useI18n();
  const title = t("notes", { defaultValue: "Notes" });
  const overrideBanner = annotations.hasRecordOverride ? (
    <Suspense fallback={null}>
      <AnnotationOverrideBanner />
    </Suspense>
  ) : null;

  // Namespaced by tab id so concurrently-rendered instances (e.g. the
  // toolbar-toggled Discover pane and a per-tab compact discover panel, or
  // several tabs' own compact panels in a split layout) never emit the same
  // DOM id for an unrelated verse-range group.
  const groupElementId = (groupKey: string) =>
    `sb-annotation-group-${tab?.id ?? "no-tab"}-${groupKey}`;

  // Which group just got scrolled to, so it can flash a highlight — cleared
  // after HIGHLIGHT_DURATION_MS so a second click on the same verse re-flashes
  // instead of leaving the highlight permanently on.
  const highlightedGroupKey = useSignal<string | null>(null);

  // Clicking an annotated verse number on desktop (BibleReader.tsx) sets
  // this once; scroll to and highlight that verse's annotation group if it's
  // this tab's chapter, then clear it. Mirrors the mobile equivalent in
  // BibleReaderToolbar.tsx.
  useEffect(() => {
    if (!tab) return;

    let frame = 0;
    let highlightTimer = 0;
    const dispose = effect(() => {
      const target = discover.scrollToVerse.value;
      if (!target) return;
      if (
        target.bookId !== tab.readingState.bookId.value ||
        target.chapterNumber !== tab.readingState.chapterNumber.value
      ) {
        return;
      }
      discover.scrollToVerse.value = null; // consume once, immediately

      const chapterAnnotations = annotations.getAnnotationsForChapter(
        target.bookId,
        target.chapterNumber
      ).value;
      const group = groupAnnotationsByVerseRange(chapterAnnotations).find((g) =>
        g.annotations.some((a) =>
          annotationVerseNumbers(a).includes(target.verseNumber)
        )
      );
      if (!group) return;

      const groupKey = `${group.startVerseNumber ?? "chapter"}-${
        group.endVerseNumber ?? "chapter"
      }`;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        document
          .getElementById(groupElementId(groupKey))
          ?.scrollIntoView({ block: "center" });
      });

      window.clearTimeout(highlightTimer);
      highlightedGroupKey.value = groupKey;
      highlightTimer = window.setTimeout(() => {
        highlightedGroupKey.value = null;
      }, HIGHLIGHT_DURATION_MS);
    });

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(highlightTimer);
      dispose();
    };
  }, [tab, discover, annotations]);

  if (!tab) {
    return (
      <DiscoverSection title={title}>
        {overrideBanner}
        {noTabHint(t)}
      </DiscoverSection>
    );
  }

  const bookId = tab.readingState.bookId.value;
  const chapterNumber = tab.readingState.chapterNumber.value;
  if (!bookId || !chapterNumber) {
    return (
      <DiscoverSection title={title}>
        {overrideBanner}
        {noTabHint(t)}
      </DiscoverSection>
    );
  }

  const chapterAnnotations = annotations.getAnnotationsForChapter(
    bookId,
    chapterNumber
  ).value;
  const groups = groupAnnotationsByVerseRange(chapterAnnotations);
  const otherPeoplePresent = annotationListHasOtherAuthors(
    chapterAnnotations,
    login.userId.value
  );
  const pending = annotations.sync.pendingCountForCollection(
    annotationCollection(bookId, chapterNumber)
  );

  return (
    <DiscoverSection title={title}>
      {overrideBanner}
      {pending > 0 ? (
        <p className="sb-annotations-pending-sync">
          {t(
            pending === 1
              ? "annotations-pending-sync"
              : "annotations-pending-sync-plural",
            {
              defaultValue:
                pending === 1
                  ? "{{count}} change waiting to sync"
                  : "{{count}} changes waiting to sync",
              count: pending,
            }
          )}
        </p>
      ) : null}
      {groups.length === 0 ? (
        <DiscoverEmpty
          text={t("discover-annotations-empty", {
            defaultValue: "You have no annotations",
          })}
        />
      ) : (
        groups.map((group) => {
          const groupKey = `${group.startVerseNumber ?? "chapter"}-${
            group.endVerseNumber ?? "chapter"
          }`;
          return (
            <AnnotationGroupSection
              key={groupKey}
              id={groupElementId(groupKey)}
              group={group}
              annotations={annotations}
              modals={modals}
              toast={toast}
              login={login}
              tabs={tabs}
              panes={panes}
              onReferenceClick={onReferenceClick}
              otherPeoplePresent={otherPeoplePresent}
              highlighted={groupKey === highlightedGroupKey.value}
            />
          );
        })
      )}
    </DiscoverSection>
  );
}

/**
 * Confirmation body shown before permanently deleting an annotation.
 * Confirming erases the annotation and closes the modal; on failure it
 * surfaces a toast but still closes.
 */
function ConfirmDeleteAnnotationModalContent(props: {
  annotations: AnnotationsManager;
  annotation: Annotation;
  toast: SeedBibleState["app"]["toast"];
  onClose: () => void;
}) {
  const { annotations, annotation, toast, onClose } = props;
  const { t } = useI18n();

  const confirm = async () => {
    try {
      await annotations.deleteAnnotationAndRefresh(annotation);
    } catch {
      toast(
        t("delete-annotation-failed", {
          defaultValue: "Couldn't delete the annotation.",
        })
      );
    }
    onClose();
  };

  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">
        {t("delete-annotation-confirm-message", {
          defaultValue: "Delete this annotation? This can't be undone.",
        })}
      </p>
      <div className="sb-confirm-delete-actions">
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onClose}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          className="sb-session-settings-end"
          onClick={confirm}
        >
          {t("delete")}
        </button>
      </div>
    </div>
  );
}

/** Opens the delete-annotation confirmation modal. */
export function openDeleteAnnotationConfirm(
  modals: ModalManager,
  annotations: AnnotationsManager,
  annotation: Annotation,
  toast: SeedBibleState["app"]["toast"]
) {
  const modalId = `delete-annotation-confirm-${annotation.id}`;
  modals.openModal({
    id: modalId,
    title: {
      key: "delete-annotation-confirm-title",
      defaultValue: "Delete annotation?",
    },
    content: () => (
      <ConfirmDeleteAnnotationModalContent
        annotations={annotations}
        annotation={annotation}
        toast={toast}
        onClose={() => modals.closeModal(modalId)}
      />
    ),
  });
}
