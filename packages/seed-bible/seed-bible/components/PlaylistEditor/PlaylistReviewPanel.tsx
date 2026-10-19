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
import { publishChecks } from "./publishChecks";

export type PlaylistVisibility = NonNullable<Playlist["visibility"]>;

/**
 * The "Who can open it" choice, shared by both editor layouts: public
 * playlists show up in Discover for friends; unlisted ones open only for
 * people who have the link.
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
        defaultValue: "Friends can find it on Seed Bible",
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
 * The last look before publishing, in the fullscreen editor's middle column:
 * the title, description, cover and who can open it on the left; how the
 * playlist will appear and what to check before publishing on the right.
 */
export function PlaylistReviewPanel(props: {
  playlists: PlaylistManager;
  modals: ModalManager;
  books: TranslationBook[];
  resolveBookName: (bookId: string) => string;
  authorName?: string | null;
  os?: Pick<CasualOSManager, "recordFile" | "recordData">;
  login?: Pick<LoginManager, "userId">;
  gallery?: Pick<UserGalleryManager, "photos" | "savePhoto" | "rememberPhoto">;
  /** Opens the step a check points at. */
  onOpenItem: (index: number) => void;
  onPublish: () => void;
  publishing: boolean;
}) {
  const {
    playlists,
    modals,
    books,
    resolveBookName,
    authorName,
    os,
    login,
    gallery,
    onOpenItem,
    onPublish,
    publishing,
  } = props;
  const { t } = useI18n();
  const editing = playlists.editingPlaylist.value;
  const items = editing?.items ?? [];
  const steps = items.filter((item) => item.type !== "scene").length;
  const scenes = items.filter((item) => item.type === "scene").length;
  const checks = publishChecks(items, books, t, resolveBookName);
  const title =
    editing?.title?.trim() ||
    t("untitled-playlist", { defaultValue: "Untitled playlist" });

  return (
    <div className="sb-playlist-review">
      <div className="sb-playlist-review-form">
        <label className="sb-playlist-editor-field">
          <span className="sb-playlist-editor-field-label">
            {t("playlist-title_placeholder", {
              defaultValue: "Playlist title",
            })}
          </span>
          <input
            className="sb-settings-text-input sb-playlist-input"
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
            {t("hero-image", { defaultValue: "Cover image" })}
          </span>
          <PlaylistCoverField
            playlists={playlists}
            modals={modals}
            os={os}
            login={login}
            gallery={gallery}
          />
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
              <span>{check.message}</span>
              {check.itemIndex !== undefined ? (
                <button
                  type="button"
                  className="sb-playlist-review-check-fix"
                  onClick={() => onOpenItem(check.itemIndex!)}
                >
                  {t("playlist-review-fix", { defaultValue: "Fix" })}
                </button>
              ) : null}
            </li>
          ))}
        </ul>

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
      </aside>
    </div>
  );
}
