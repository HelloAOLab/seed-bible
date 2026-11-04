import "./PlaylistReviewPanel.css";
import { useI18n } from "../../i18n/I18nManager";
import type { Playlist, PlaylistManager } from "../../managers/PlaylistManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import { MaterialIcon } from "../icons";
import { SharedPageModalContent } from "../SharedPageModal/SharedPageModal";
import { minutesLabel, playlistMinutes } from "../playlistItemSubtitle";
import { publishChecks } from "./publishChecks";
import { PlaylistStepPreviews } from "./PlaylistStepPreview";
import type { ScriptureChapterLoader } from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";

export type PlaylistVisibility = NonNullable<Playlist["visibility"]>;

/** What each "Who can open it" choice is called, for a summary line. */
export function visibilityLabel(
  visibility: Playlist["visibility"],
  t: ReturnType<typeof useI18n>["t"]
): string {
  switch (visibility ?? "public") {
    case "private":
      return t("playlist-visibility-private", { defaultValue: "Only me" });
    case "unlisted":
      return t("playlist-visibility-unlisted", {
        defaultValue: "Anyone with a link",
      });
    default:
      return t("playlist-visibility-friends", {
        defaultValue: "Me and my friends",
      });
  }
}

/**
 * The "Who can open it" choice. Only me keeps a draft private. Me and my
 * friends is how every playlist worked before this choice existed: friends
 * find it in Discover (it is stored readable by link, as all shared
 * playlists are). Anyone with a link keeps it out of friends' Discover, so
 * only people sent the link find it.
 */
export function PlaylistVisibilityField(props: { playlists: PlaylistManager }) {
  const { playlists } = props;
  const { t } = useI18n();
  const editing = playlists.editingPlaylist.value;
  const current: PlaylistVisibility = editing?.visibility ?? "public";
  const choices: {
    value: PlaylistVisibility;
    selected: boolean;
    label: string;
    description: string;
  }[] = [
    {
      value: "private",
      selected: current === "private",
      label: visibilityLabel("private", t),
      description: t("playlist-visibility-private-description", {
        defaultValue: "Keep it as a draft for yourself",
      }),
    },
    {
      value: "public",
      selected: current === "public",
      label: visibilityLabel("public", t),
      description: t("playlist-visibility-friends-description", {
        defaultValue: "Your friends see it in Discover",
      }),
    },
    {
      value: "unlisted",
      selected: current === "unlisted",
      label: visibilityLabel("unlisted", t),
      description: t("playlist-visibility-link-only-description", {
        defaultValue: "Only people you send the link to",
      }),
    },
  ];
  return (
    <div
      className="sb-playlist-visibility"
      role="radiogroup"
      aria-label={t("playlist-visibility-label", {
        defaultValue: "Who can open it",
      })}
    >
      {choices.map((choice) => (
        <button
          key={choice.value}
          type="button"
          role="radio"
          aria-checked={choice.selected}
          className={`sb-playlist-visibility-choice${
            choice.selected ? " sb-playlist-visibility-choice--selected" : ""
          }`}
          onClick={() => {
            if (!choice.selected) {
              playlists.updateEditingPlaylistMetadata({
                visibility: choice.value,
              });
            }
          }}
        >
          <span className="sb-playlist-visibility-radio" aria-hidden="true" />
          <span className="sb-playlist-visibility-text">
            <span className="sb-playlist-visibility-title">{choice.label}</span>
            <span className="sb-playlist-visibility-description">
              {choice.description}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * The last look before publishing: the playlist as a shared link shows it
 * (cover, author, description, length), its steps in order, who can open
 * it, and anything worth checking first. Nothing is edited here: who can
 * open it is chosen on the details screen, which "Change" goes back to.
 */
export function PlaylistReviewPanel(props: {
  playlists: PlaylistManager;
  books: TranslationBook[];
  resolveBookName: (bookId: string) => string;
  /** Loads chapters, for the steps' passages as readers will see them. */
  loadChapter?: ScriptureChapterLoader;
  authorName?: string | null;
  translationName?: string;
  /** Opens the step a check points at. */
  onOpenItem: (index: number) => void;
  /** Goes to the details screen, where who can open it is chosen. */
  onEditDetails: () => void;
  onBack: () => void;
  onPublish: () => void;
  publishing: boolean;
}) {
  const {
    playlists,
    books,
    resolveBookName,
    loadChapter,
    authorName,
    translationName,
    onOpenItem,
    onEditDetails,
    onBack,
    onPublish,
    publishing,
  } = props;
  const { t } = useI18n();
  const editing = playlists.editingPlaylist.value;
  const items = editing?.items ?? [];
  const checks = publishChecks(items, books, t, resolveBookName, {
    translationName,
  });
  const title =
    editing?.title?.trim() ||
    t("untitled-playlist", { defaultValue: "Untitled playlist" });
  const onlyMe = editing?.visibility === "private";
  const publishLabel = publishing
    ? t("saving", { defaultValue: "Saving…" })
    : onlyMe
      ? t("playlist-save-draft", { defaultValue: "Save draft" })
      : t("playlist-publish", { defaultValue: "Publish" });

  return (
    <div className="sb-playlist-review">
      <header className="sb-playlist-review-header">
        <button
          type="button"
          className="sb-reading-plans-back sb-playlist-editor-back"
          aria-label={t("back", { defaultValue: "Back" })}
          onClick={onBack}
        >
          <MaterialIcon>chevron_left</MaterialIcon>
        </button>
        <h2 className="sb-playlist-review-heading">
          {t("playlist-review-publish", { defaultValue: "Review & publish" })}
        </h2>
        {/* Also up here: the steps can make the page long. */}
        <button
          type="button"
          className="sb-settings-save-button sb-playlist-review-header-publish"
          disabled={publishing || items.length === 0}
          onClick={onPublish}
        >
          {publishLabel}
        </button>
      </header>
      <div className="sb-playlist-review-body">
        <h3 className="sb-playlist-review-title">{title}</h3>
        <SharedPageModalContent
          heroImageUrl={editing?.heroImageUrl}
          authorName={authorName ?? null}
          description={editing?.description ?? null}
          lengthLabel={`${t("playlist-editor-step-count", {
            defaultValue: "{{count}} steps",
            count: items.length,
          })} · ~${minutesLabel(playlistMinutes(items), t)}`}
          closeLabel={t("playlist-review-keep-editing", {
            defaultValue: "Keep editing",
          })}
          onClose={onBack}
          actions={[
            {
              label: publishLabel,
              primary: true,
              disabled: publishing || items.length === 0,
              onClick: onPublish,
            },
          ]}
        >
          <p className="sb-playlist-review-visibility">
            <span>
              {t("playlist-visibility-summary", {
                defaultValue: "Who can open it: {{who}}",
                who: visibilityLabel(editing?.visibility, t),
              })}
            </span>{" "}
            <button
              type="button"
              className="sb-playlist-review-check-fix"
              onClick={onEditDetails}
            >
              {t("playlist-review-change", { defaultValue: "Change" })}
            </button>
          </p>

          <section className="sb-playlist-review-section">
            <h4 className="sb-playlist-review-section-title">
              {t("playlist-review-before", {
                defaultValue: "Before you publish",
              })}
            </h4>
            <ul className="sb-playlist-review-checks">
              {checks.map((check, index) => (
                <li
                  key={index}
                  className={`sb-playlist-review-check${
                    check.ok ? "" : " sb-playlist-review-check--warn"
                  }`}
                >
                  <MaterialIcon>{check.ok ? "check" : "warning"}</MaterialIcon>
                  <span>
                    {check.message}
                    {check.itemIndex !== undefined ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          className="sb-playlist-review-check-fix"
                          onClick={() => onOpenItem(check.itemIndex!)}
                        >
                          {check.action ??
                            t("playlist-review-fix", { defaultValue: "Fix" })}
                        </button>
                      </>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="sb-playlist-review-section">
            <h4 className="sb-playlist-review-section-title">
              {t("playlist-review-steps", {
                defaultValue: "The steps as readers will see them",
              })}
            </h4>
            <div className="sb-playlist-review-previews">
              <PlaylistStepPreviews
                items={items}
                loadChapter={loadChapter}
                resolveBookName={resolveBookName}
              />
            </div>
          </section>
        </SharedPageModalContent>
      </div>
    </div>
  );
}
