import "./PlaylistReviewPanel.css";
import { useI18n } from "../../i18n/I18nManager";
import type { Playlist, PlaylistManager } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { CasualOSManager } from "../../managers/OsManager";
import type { LoginManager } from "../../managers/LoginManager";
import type { UserGalleryManager } from "../../managers/UserGalleryManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import { MaterialIcon } from "../icons";
import {
  PlaylistCoverField,
  PlaylistDescriptionField,
} from "../CreatePlaylistForm/CreatePlaylistForm";
import { minutesLabel, playlistMinutes } from "../playlistItemSubtitle";
import { publishChecks } from "./publishChecks";

export type PlaylistVisibility = NonNullable<Playlist["visibility"]>;

/**
 * The "Who can open it" choice, shared by both editor layouts: a private
 * playlist is a draft only its author opens; an unlisted one opens for
 * people with the link; a public one shows up in Discover.
 */
export function PlaylistVisibilityField(props: { playlists: PlaylistManager }) {
  const { playlists } = props;
  const { t } = useI18n();
  const editing = playlists.editingPlaylist.value;
  const current: PlaylistVisibility = editing?.visibility ?? "public";
  const choices: {
    value: PlaylistVisibility;
    label: string;
    description: string;
  }[] = [
    {
      value: "private",
      label: t("playlist-visibility-private", { defaultValue: "Only me" }),
      description: t("playlist-visibility-private-description", {
        defaultValue: "Keep it as a draft for yourself",
      }),
    },
    {
      value: "unlisted",
      label: t("playlist-visibility-unlisted", {
        defaultValue: "Anyone with the link",
      }),
      description: t("playlist-visibility-unlisted-description", {
        defaultValue: "Good for a church group or class",
      }),
    },
    {
      value: "public",
      label: t("playlist-visibility-public", {
        defaultValue: "Public in Discover",
      }),
      description: t("playlist-visibility-public-description", {
        defaultValue: "Anyone on Seed Bible can find it",
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
          aria-checked={current === choice.value}
          className={`sb-playlist-visibility-choice${
            current === choice.value
              ? " sb-playlist-visibility-choice--selected"
              : ""
          }`}
          onClick={() =>
            playlists.updateEditingPlaylistMetadata({
              visibility: choice.value,
            })
          }
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
 * The last look before publishing, filling the editor: the title,
 * description, cover and who can open it on the left; how the playlist will
 * appear and what to check before publishing on the right, with Test with
 * a group and Publish beneath.
 */
export function PlaylistReviewPanel(props: {
  playlists: PlaylistManager;
  modals: ModalManager;
  books: TranslationBook[];
  resolveBookName: (bookId: string) => string;
  authorName?: string | null;
  translationName?: string;
  os?: Pick<CasualOSManager, "recordFile" | "recordData">;
  login?: Pick<LoginManager, "userId">;
  gallery?: Pick<UserGalleryManager, "photos" | "savePhoto" | "rememberPhoto">;
  /** Opens the step a check points at. */
  onOpenItem: (index: number) => void;
  onBack: () => void;
  onTestWithGroup?: () => void;
  onPublish: () => void;
  publishing: boolean;
}) {
  const {
    playlists,
    modals,
    books,
    resolveBookName,
    authorName,
    translationName,
    os,
    login,
    gallery,
    onOpenItem,
    onBack,
    onTestWithGroup,
    onPublish,
    publishing,
  } = props;
  const { t } = useI18n();
  const editing = playlists.editingPlaylist.value;
  const items = editing?.items ?? [];
  const steps = items.filter((item) => item.type !== "scene").length;
  const scenes = items.filter((item) => item.type === "scene").length;
  const checks = publishChecks(items, books, t, resolveBookName, {
    translationName,
  });
  const title =
    editing?.title?.trim() ||
    t("untitled-playlist", { defaultValue: "Untitled playlist" });

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
        <h2 className="sb-playlist-review-title">
          {t("playlist-review-publish", { defaultValue: "Review & publish" })}
        </h2>
      </header>
      <div className="sb-playlist-review-body">
        <div className="sb-playlist-review-form">
          <label className="sb-playlist-editor-field">
            <span className="sb-playlist-editor-field-label">
              {t("playlist-review-title", { defaultValue: "Title" })}
            </span>
            <input
              className="sb-settings-text-input sb-playlist-input sb-playlist-review-title-input"
              type="text"
              value={editing?.title ?? ""}
              dir="auto"
              onInput={(event: Event) => {
                const value = (event.currentTarget as HTMLInputElement).value;
                playlists.updateEditingPlaylistMetadata({
                  title: value.trim() ? value : null,
                });
              }}
            />
          </label>
          <label className="sb-playlist-editor-field">
            <span className="sb-playlist-editor-field-label">
              {t("description", { defaultValue: "Description" })}
            </span>
            <PlaylistDescriptionField playlists={playlists} />
          </label>
          <div className="sb-playlist-editor-field">
            <span className="sb-playlist-editor-field-label">
              {t("playlist-review-cover", { defaultValue: "Cover" })}
            </span>
            <div className="sb-playlist-review-covers">
              <div className="sb-playlist-review-cover-upload">
                <PlaylistCoverField
                  playlists={playlists}
                  modals={modals}
                  os={os}
                  login={login}
                  gallery={gallery}
                />
              </div>
              <button
                type="button"
                className={`sb-playlist-review-cover-text${
                  editing?.heroImageUrl
                    ? ""
                    : " sb-playlist-review-cover-text--selected"
                }`}
                aria-pressed={!editing?.heroImageUrl}
                onClick={() =>
                  playlists.updateEditingPlaylistMetadata({
                    heroImageUrl: null,
                  })
                }
              >
                {t("playlist-review-text-cover", {
                  defaultValue: "Text cover",
                })}
              </button>
            </div>
          </div>
          <div className="sb-playlist-editor-field">
            <span className="sb-playlist-editor-field-label">
              {t("playlist-visibility-label", {
                defaultValue: "Who can open it",
              })}
            </span>
            <PlaylistVisibilityField playlists={playlists} />
          </div>
        </div>

        <aside className="sb-playlist-review-side">
          <div className="sb-playlist-editor-column-head">
            <span>
              {t("playlist-review-appearance", {
                defaultValue: "How it appears",
              })}
            </span>
          </div>
          <div className="sb-playlist-review-card">
            {editing?.heroImageUrl ? (
              <img
                className="sb-playlist-review-card-cover"
                src={editing.heroImageUrl}
                alt=""
              />
            ) : (
              <div className="sb-playlist-review-card-cover sb-playlist-review-card-cover--text">
                {title}
              </div>
            )}
            <div className="sb-playlist-review-card-body">
              <span className="sb-playlist-review-card-title">{title}</span>
              <span className="sb-playlist-review-card-meta">
                {[
                  authorName
                    ? t("shared-page-by-author", {
                        defaultValue: "By {{author}}",
                        author: authorName,
                      })
                    : null,
                  t("playlist-editor-step-count", {
                    defaultValue: "{{count}} steps",
                    count: steps,
                  }),
                  `~${minutesLabel(playlistMinutes(items), t)}`,
                  scenes > 0
                    ? t("playlist-scene-count", {
                        defaultValue: "{{count}} scenes",
                        count: scenes,
                      })
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          </div>

          <div className="sb-playlist-review-checks-card">
            <div className="sb-playlist-editor-column-head">
              <span>
                {t("playlist-review-before", {
                  defaultValue: "Before you publish",
                })}
              </span>
            </div>
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
          </div>

          <div className="sb-playlist-review-actions">
            {onTestWithGroup ? (
              <button
                type="button"
                className="sb-playlist-editor-secondary"
                onClick={onTestWithGroup}
              >
                {t("playlist-editor-test-group", {
                  defaultValue: "Test with a group",
                })}
              </button>
            ) : null}
            <button
              type="button"
              className="sb-settings-save-button sb-playlist-review-publish"
              onClick={onPublish}
              disabled={publishing || steps === 0}
            >
              {publishing
                ? t("saving", { defaultValue: "Saving…" })
                : t("playlist-publish", { defaultValue: "Publish" })}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
