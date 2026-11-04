import "./PlaylistReviewPanel.css";
import { useI18n } from "../../i18n/I18nManager";
import type { Playlist, PlaylistManager } from "../../managers/PlaylistManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import { MaterialIcon } from "../icons";
import { SharedPageModalContent } from "../SharedPageModal/SharedPageModal";
import { playlistItemLabel } from "../playlistItemLabel";
import {
  minutesLabel,
  playlistItemQueueLine,
  playlistMinutes,
} from "../playlistItemSubtitle";
import { publishChecks } from "./publishChecks";

export type PlaylistVisibility = NonNullable<Playlist["visibility"]>;

/**
 * The "Who can open it" choice: only the author, as a draft, or anyone with
 * the link. A playlist anyone can open also shows to the author's friends in
 * Discover, as every playlist did before this choice existed; there is no
 * public search yet to offer more than that. A playlist an earlier build left
 * unlisted counts as "anyone with the link" and stays unlisted.
 */
export function PlaylistVisibilityField(props: { playlists: PlaylistManager }) {
  const { playlists } = props;
  const { t } = useI18n();
  const editing = playlists.editingPlaylist.value;
  const onlyMe = editing?.visibility === "private";
  const choices: {
    value: PlaylistVisibility;
    selected: boolean;
    label: string;
    description: string;
  }[] = [
    {
      value: "private",
      selected: onlyMe,
      label: t("playlist-visibility-private", { defaultValue: "Only me" }),
      description: t("playlist-visibility-private-description", {
        defaultValue: "Keep it as a draft for yourself",
      }),
    },
    {
      value: "public",
      selected: !onlyMe,
      label: t("playlist-visibility-unlisted", {
        defaultValue: "Anyone with the link",
      }),
      description: t("playlist-visibility-link-description", {
        defaultValue: "Your friends also see it in Discover",
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
 * it, and anything worth checking first. Its details are edited on the
 * steps screen; this one only shows them.
 */
export function PlaylistReviewPanel(props: {
  playlists: PlaylistManager;
  books: TranslationBook[];
  resolveBookName: (bookId: string) => string;
  authorName?: string | null;
  translationName?: string;
  /** Opens the step a check points at. */
  onOpenItem: (index: number) => void;
  onBack: () => void;
  onPublish: () => void;
  publishing: boolean;
}) {
  const {
    playlists,
    books,
    resolveBookName,
    authorName,
    translationName,
    onOpenItem,
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
              label: publishing
                ? t("saving", { defaultValue: "Saving…" })
                : onlyMe
                  ? t("playlist-save-draft", { defaultValue: "Save draft" })
                  : t("playlist-publish", { defaultValue: "Publish" }),
              primary: true,
              disabled: publishing || items.length === 0,
              onClick: onPublish,
            },
          ]}
        >
          <ol className="sb-playlist-review-steps">
            {items.map((item, index) => (
              <li key={index} className="sb-playlist-review-step">
                <span className="sb-playlist-review-step-label" dir="auto">
                  {playlistItemLabel(item, t, resolveBookName)}
                </span>
                <span className="sb-playlist-review-step-meta">
                  {playlistItemQueueLine(item, t)}
                </span>
              </li>
            ))}
          </ol>

          <section className="sb-playlist-review-section">
            <h4 className="sb-playlist-review-section-title">
              {t("playlist-visibility-label", {
                defaultValue: "Who can open it",
              })}
            </h4>
            <PlaylistVisibilityField playlists={playlists} />
          </section>

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
        </SharedPageModalContent>
      </div>
    </div>
  );
}
