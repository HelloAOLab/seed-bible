import "./PlaylistStepScreen.css";
import { useI18n } from "../../i18n/I18nManager";
import {
  expandCrossChapterItem,
  queueIndexOfStep,
  type PlayingState,
  type PlaylistItemData,
  type PlaylistManager,
} from "../../managers/PlaylistManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { getShareUrl, openShareModal } from "../../managers/BibleToolsManager";
import { MaterialIcon } from "../icons";
import { playlistItemLabel } from "../playlistItemLabel";
import {
  minutesLabel,
  playlistItemIcon,
  playlistItemKind,
  playlistItemMinutes,
  playlistMinutes,
} from "../playlistItemSubtitle";
import { PlaylistHtmlContent } from "../PlaylistHtmlContent/PlaylistHtmlContent";
import { PlaylistLinkContent } from "../PlaylistLinkContent/PlaylistLinkContent";
import {
  CompareStepContent,
  QuestionStepContent,
} from "../PlaylistStepContent/PlaylistStepContent";
import { PlaylistPartyPanel } from "../PlaylistPartyPanel/PlaylistPartyPanel";
import { isLocalSessionHost } from "../Tabs/Tabs";

/** A scene of the playlist and the queue steps (1-based) it spans. */
export interface PlaylistSceneSummary {
  title: string;
  subtitle: string | null;
  firstStep: number;
  lastStep: number;
  /** The kinds of the steps under it, in order, as the reader sees them. */
  kinds: string[];
}

/**
 * The playlist's scenes with the steps each one covers, counting queue
 * steps (so a passage that spans chapters counts once per chapter). A scene
 * with nothing under it is left out.
 */
export function playlistScenes(
  items: PlaylistItemData[],
  t: ReturnType<typeof useI18n>["t"]
): PlaylistSceneSummary[] {
  const scenes: PlaylistSceneSummary[] = [];
  let cursor = 0;
  let open: PlaylistSceneSummary | null = null;
  for (const item of items) {
    if (item.type === "scene") {
      open = {
        title: item.title,
        subtitle: item.subtitle?.trim() || null,
        firstStep: cursor + 1,
        lastStep: cursor,
        kinds: [],
      };
      scenes.push(open);
      continue;
    }
    const count = expandCrossChapterItem(item).length;
    if (open && count > 0) {
      open.lastStep = cursor + count;
      open.kinds.push(playlistItemKind(item, t));
    }
    cursor += count;
  }
  return scenes.filter((scene) => scene.lastStep >= scene.firstStep);
}

/** The pane's title (read by assistive tech; the pane shows no header). */
export function PlaylistStepScreenTitle(props: { playlists: PlaylistManager }) {
  const { t } = useI18n();
  const playlist = props.playlists.playing.value?.playlists.value[0];
  return (
    <>
      {playlist?.title ??
        t("untitled-playlist", { defaultValue: "Untitled playlist" })}
    </>
  );
}

/**
 * A text, link, question or compare step filling the reader area while it
 * plays: the playlist's name and length over a progress bar, the step's
 * kind, position and length over its title and content, and the way on at
 * the foot. The first step of a playlist with scenes doubles as its
 * overview, mapping where the playlist goes. Scripture steps show in the
 * reader instead, with the playlist in its side panel or sheet.
 */
export function PlaylistStepScreen(props: {
  playlists: PlaylistManager;
  state: SeedBibleState;
}) {
  const { playlists, state } = props;
  const playing = playlists.playing.value;
  const item = playing?.currentItem.value ?? null;
  if (
    !playing ||
    !item ||
    item.type === "bible-verse" ||
    item.type === "scene"
  ) {
    return null;
  }
  return (
    <PlaylistStepScreenBody
      playing={playing}
      item={item}
      playlists={playlists}
      state={state}
    />
  );
}

function PlaylistStepScreenBody(props: {
  playing: PlayingState;
  item: Exclude<PlaylistItemData, { type: "bible-verse" | "scene" }>;
  playlists: PlaylistManager;
  state: SeedBibleState;
}) {
  const { playing, item, playlists, state } = props;
  const { t } = useI18n();
  const queue = playing.queue.value;
  const index = playing.currentIndex.value;
  const playlist = playing.playlists.value[0];
  const items = playlist?.items ?? [];
  const author = playlists.playingAuthorName.value;
  const options = playlists.playingStepOptions(playing);
  const resolveBookName = options.resolveBookName ?? ((id: string) => id);
  const scenes =
    index === 0 && item.type === "html" ? playlistScenes(items, t) : [];
  const nextItem = queue[index + 1] ?? null;
  // In a shared session the leader moves the group on and everyone else says
  // they're ready, as on scripture steps, instead of each stepping alone.
  const session = playing.tab?.sharedSession ?? null;
  const title =
    item.type === "question"
      ? item.title?.trim() || item.prompt
      : item.type === "compare"
        ? item.title?.trim() || playlistItemLabel(item, t, resolveBookName)
        : item.title?.trim() ||
          (item.type === "link" ? item.preview?.title : undefined) ||
          playlistItemLabel(item, t, resolveBookName);
  const stepsLabel = t("playlist-steps-count", {
    defaultValue: "{{count}} steps",
    count: queue.length,
  });
  const totalMinutes = minutesLabel(playlistMinutes(queue), t);

  const readWithOthers = () => {
    const tab = playing.tab;
    if (!tab || !state.modals || !state.app) {
      return;
    }
    openShareModal(
      {
        modals: state.modals,
        app: state.app,
        toast: state.app.toast,
        sharedSession: tab.sharedSession,
        embedThemes: state.theme?.themes,
        customizationLocator: state.customizations?.activeCustomizationLocator,
      },
      getShareUrl(tab.readingState)
    );
  };

  return (
    <div className="sb-step-screen" dir="auto">
      <header className="sb-step-screen-header">
        <div className="sb-step-screen-heading">
          <p className="sb-step-screen-eyebrow">
            {author
              ? t("playlist-step-screen-eyebrow", {
                  defaultValue:
                    "Playlist · By {{author}} · {{steps}} · ~{{minutes}}",
                  author,
                  steps: stepsLabel,
                  minutes: totalMinutes,
                })
              : t("playlist-step-screen-eyebrow-anonymous", {
                  defaultValue: "Playlist · {{steps}} · ~{{minutes}}",
                  steps: stepsLabel,
                  minutes: totalMinutes,
                })}
          </p>
          <h2 className="sb-step-screen-playlist">
            {playlist?.title ??
              t("untitled-playlist", { defaultValue: "Untitled playlist" })}
          </h2>
        </div>
        <div
          className="sb-step-screen-progress"
          role="progressbar"
          aria-label={t("playlist-progress", {
            defaultValue: "Playlist progress",
          })}
          aria-valuemin={0}
          aria-valuemax={queue.length}
          aria-valuenow={index + 1}
        >
          {queue.map((_, i) => (
            <span
              key={i}
              className={
                "sb-step-screen-segment" +
                (i <= index ? " sb-step-screen-segment--reached" : "")
              }
            />
          ))}
        </div>
        {!session ? (
          <button
            type="button"
            className="sb-step-screen-read-with"
            onClick={readWithOthers}
          >
            <MaterialIcon>group</MaterialIcon>
            {t("playlist-read-with-others", {
              defaultValue: "Read with others",
            })}
          </button>
        ) : null}
        <button
          type="button"
          className="sb-step-screen-close"
          aria-label={t("close", { defaultValue: "Close" })}
          onClick={() => playlists.stopPlaying()}
        >
          <MaterialIcon>close</MaterialIcon>
        </button>
      </header>

      <div className="sb-step-screen-body">
        <article className="sb-step-screen-content">
          <p className="sb-step-screen-step-eyebrow">
            <MaterialIcon>{playlistItemIcon(item)}</MaterialIcon>
            <span>
              {t("playlist-step-eyebrow", {
                defaultValue:
                  "{{kind}} · Step {{step}} of {{total}} · {{minutes}}",
                kind: playlistItemKind(item, t),
                step: index + 1,
                total: queue.length,
                minutes: minutesLabel(playlistItemMinutes(item), t),
              })}
            </span>
          </p>
          <h1 className="sb-step-screen-title">{title}</h1>

          {item.type === "html" ? (
            <div className="sb-step-screen-text">
              <PlaylistHtmlContent
                html={item.html}
                loadChapter={options.loadChapter}
                onStepLink={(step) => {
                  const target = queueIndexOfStep(items, step);
                  if (target !== null) {
                    void playing.jumpTo(target);
                  }
                }}
              />
            </div>
          ) : item.type === "link" ? (
            <PlaylistLinkContent
              url={item.url}
              title={item.title}
              embed={item.embed}
              preview={item.preview}
            />
          ) : item.type === "question" ? (
            <QuestionStepContent
              item={item}
              authorName={options.authorName}
              initialResponse={options.questionResponse}
              inSession={options.inSession}
              onSave={options.onSaveQuestionResponse}
            />
          ) : (
            <CompareStepContent
              item={item}
              loadChapter={options.loadChapter}
              resolveBookName={resolveBookName}
              onOpenPassage={options.onOpenPassage}
              playing={playing}
            />
          )}

          {scenes.length > 0 ? (
            <section
              className="sb-step-screen-map"
              aria-label={t("playlist-where-it-goes", {
                defaultValue: "Where this playlist goes",
              })}
            >
              <h3 className="sb-step-screen-map-title">
                {t("playlist-where-it-goes", {
                  defaultValue: "Where this playlist goes",
                })}
              </h3>
              <ol className="sb-step-screen-scenes">
                {scenes.map((scene, i) => (
                  <li key={i} className="sb-step-screen-scene">
                    <button
                      type="button"
                      className="sb-step-screen-scene-button"
                      onClick={() => void playing.jumpTo(scene.firstStep - 1)}
                    >
                      <span className="sb-step-screen-scene-eyebrow">
                        {scene.firstStep === scene.lastStep
                          ? t("playlist-scene-eyebrow-one", {
                              defaultValue: "Scene {{index}} · Step {{step}}",
                              index: i + 1,
                              step: scene.firstStep,
                            })
                          : t("playlist-scene-eyebrow", {
                              defaultValue:
                                "Scene {{index}} · Steps {{from}}–{{to}}",
                              index: i + 1,
                              from: scene.firstStep,
                              to: scene.lastStep,
                            })}
                      </span>
                      <span className="sb-step-screen-scene-title">
                        {scene.title}
                      </span>
                      {scene.subtitle ? (
                        <span className="sb-step-screen-scene-subtitle">
                          {scene.subtitle}
                        </span>
                      ) : null}
                      <span className="sb-step-screen-scene-kinds">
                        {scene.kinds.join(" · ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </article>
      </div>

      <footer className="sb-step-screen-footer">
        {nextItem ? (
          <div className="sb-step-screen-up-next">
            <span className="sb-step-screen-up-next-line">
              {t("playlist-up-next-kind", {
                defaultValue: "Up next · {{kind}} · {{minutes}}",
                kind: playlistItemKind(nextItem, t),
                minutes: minutesLabel(playlistItemMinutes(nextItem), t),
              })}
            </span>
            <span className="sb-step-screen-up-next-title">
              {playlistItemLabel(nextItem, t, resolveBookName)}
            </span>
          </div>
        ) : (
          <div className="sb-step-screen-up-next">
            <span className="sb-step-screen-up-next-line">
              {t("playlist-last-step", { defaultValue: "Last step" })}
            </span>
          </div>
        )}
        {session ? (
          <PlaylistPartyPanel
            session={session}
            playing={playing}
            isLeader={isLocalSessionHost(state, session)}
            resolveBookName={resolveBookName}
            compact
            onOpenChat={() => state.sidebar?.openChatPanel()}
          />
        ) : (
          <div className="sb-step-screen-nav">
            {playing.hasPrevious.value ? (
              <button
                type="button"
                className="sb-step-screen-previous"
                onClick={() => void playing.previous()}
              >
                {t("previous", { defaultValue: "Previous" })}
              </button>
            ) : null}
            <button
              type="button"
              className="sb-step-screen-next"
              disabled={!playing.canPressNext.value}
              onClick={() => void playing.next()}
            >
              {index === 0 && nextItem
                ? t("playlist-begin", { defaultValue: "Begin" })
                : nextItem
                  ? t("playlist-next-step-button", {
                      defaultValue: "Next step",
                    })
                  : t("finish", { defaultValue: "Finish" })}
              <MaterialIcon>arrow_forward</MaterialIcon>
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}
