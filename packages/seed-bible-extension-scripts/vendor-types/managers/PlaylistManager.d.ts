import { z } from "zod";
import type { LoginManager } from "./LoginManager";
import { type ReadonlySignal, type Signal } from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
import type { ReaderTab, TabsManager } from "./TabsManager";
import type { NavigationManager } from "./NavigationManager";
import type { ModalManager } from "./ModalManager";
import type { I18nManager } from "../i18n";
import type {
  BibleReadingExtensionManager,
  ReadingExtensionInstance,
} from "./BibleReadingExtensionManager";
export declare const VerseRefSchema: z.ZodObject<
  {
    bookId: z.ZodString;
    chapter: z.ZodNumber;
    endChapter: z.ZodOptional<z.ZodNumber>;
    verse: z.ZodOptional<z.ZodNumber>;
    endVerse: z.ZodOptional<z.ZodNumber>;
    toEndOfChapter: z.ZodOptional<z.ZodBoolean>;
  },
  z.core.$strip
>;
export declare const PlaylistItem: z.ZodDiscriminatedUnion<
  [
    z.ZodObject<
      {
        type: z.ZodLiteral<"bible-verse">;
        ref: z.ZodObject<
          {
            bookId: z.ZodString;
            chapter: z.ZodNumber;
            endChapter: z.ZodOptional<z.ZodNumber>;
            verse: z.ZodOptional<z.ZodNumber>;
            endVerse: z.ZodOptional<z.ZodNumber>;
            toEndOfChapter: z.ZodOptional<z.ZodBoolean>;
          },
          z.core.$strip
        >;
        translationId: z.ZodOptional<z.ZodString>;
      },
      z.core.$strip
    >,
    z.ZodObject<
      {
        type: z.ZodLiteral<"html">;
        title: z.ZodOptional<z.ZodString>;
        html: z.ZodString;
      },
      z.core.$strip
    >,
    z.ZodObject<
      {
        type: z.ZodLiteral<"link">;
        title: z.ZodOptional<z.ZodString>;
        url: z.ZodURL;
        embed: z.ZodOptional<z.ZodBoolean>;
      },
      z.core.$strip
    >,
  ],
  "type"
>;
export declare const PlaylistSchema: z.ZodObject<
  {
    id: z.ZodString;
    recordName: z.ZodString;
    authorUserId: z.ZodString;
    title: z.ZodNullable<z.ZodString>;
    description: z.ZodNullable<z.ZodString>;
    items: z.ZodArray<
      z.ZodDiscriminatedUnion<
        [
          z.ZodObject<
            {
              type: z.ZodLiteral<"bible-verse">;
              ref: z.ZodObject<
                {
                  bookId: z.ZodString;
                  chapter: z.ZodNumber;
                  endChapter: z.ZodOptional<z.ZodNumber>;
                  verse: z.ZodOptional<z.ZodNumber>;
                  endVerse: z.ZodOptional<z.ZodNumber>;
                  toEndOfChapter: z.ZodOptional<z.ZodBoolean>;
                },
                z.core.$strip
              >;
              translationId: z.ZodOptional<z.ZodString>;
            },
            z.core.$strip
          >,
          z.ZodObject<
            {
              type: z.ZodLiteral<"html">;
              title: z.ZodOptional<z.ZodString>;
              html: z.ZodString;
            },
            z.core.$strip
          >,
          z.ZodObject<
            {
              type: z.ZodLiteral<"link">;
              title: z.ZodOptional<z.ZodString>;
              url: z.ZodURL;
              embed: z.ZodOptional<z.ZodBoolean>;
            },
            z.core.$strip
          >,
        ],
        "type"
      >
    >;
    createdAtMs: z.ZodNumber;
    updatedAtMs: z.ZodNumber;
  },
  z.core.$strip
>;
export type Playlist = z.infer<typeof PlaylistSchema>;
export type PlaylistItemData = z.infer<typeof PlaylistItem>;
export type VerseRef = z.infer<typeof VerseRefSchema>;
export type PlaylistManager = ReturnType<typeof createPlaylistManager>;
export type PlayingState = ReturnType<typeof createPlayingState>;
/**
 * The serializable playback state the playlist reading extension stores in its
 * per-enablement `data`. Kept as plain JSON so it can be mirrored across a
 * shared session (see `SessionsManager`). The live {@link PlayingState} (which
 * holds signals and effects) is built from this and never stored here.
 *
 * `queue` is a copy of the source playlists' items, so it can be reordered or
 * have items added/removed without mutating `playlists`; both are synced.
 */
export interface PlaylistReadingData {
  playlists: Playlist[];
  queue: PlaylistItemData[];
  step: number;
}
/**
 * The reading-extension instance the playlist extension returns from
 * `activate()`. It carries the live {@link PlayingState} so `PlaylistManager`
 * can read it off the enabled runtime instead of storing playback itself.
 */
export interface PlaylistReadingExtensionInstance extends ReadingExtensionInstance<PlaylistReadingData> {
  playingState: PlayingState;
}
/**
 * Creates an in-memory playing state for stepping through one or more
 * playlists. The queue is a copy of the source playlists' items, so
 * manipulating it never mutates the underlying playlists.
 *
 * When a `tab` is provided, advancing to a `bible-verse` item navigates that
 * tab's reader to the verse. The tab is the one saved when playback started, so
 * navigation keeps targeting it even if the user later switches tabs.
 */
export declare function createPlayingState(
  sourcePlaylists: Playlist[],
  tab?: ReaderTab | null
): {
  playlists: Signal<
    {
      id: string;
      recordName: string;
      authorUserId: string;
      title: string | null;
      description: string | null;
      items: (
        | {
            type: "bible-verse";
            ref: {
              bookId: string;
              chapter: number;
              endChapter?: number | undefined;
              verse?: number | undefined;
              endVerse?: number | undefined;
              toEndOfChapter?: boolean | undefined;
            };
            translationId?: string | undefined;
          }
        | {
            type: "html";
            html: string;
            title?: string | undefined;
          }
        | {
            type: "link";
            url: string;
            title?: string | undefined;
            embed?: boolean | undefined;
          }
      )[];
      createdAtMs: number;
      updatedAtMs: number;
    }[]
  >;
  queue: Signal<
    (
      | {
          type: "bible-verse";
          ref: {
            bookId: string;
            chapter: number;
            endChapter?: number | undefined;
            verse?: number | undefined;
            endVerse?: number | undefined;
            toEndOfChapter?: boolean | undefined;
          };
          translationId?: string | undefined;
        }
      | {
          type: "html";
          html: string;
          title?: string | undefined;
        }
      | {
          type: "link";
          url: string;
          title?: string | undefined;
          embed?: boolean | undefined;
        }
    )[]
  >;
  currentIndex: Signal<number>;
  currentItem: ReadonlySignal<
    | {
        type: "bible-verse";
        ref: {
          bookId: string;
          chapter: number;
          endChapter?: number | undefined;
          verse?: number | undefined;
          endVerse?: number | undefined;
          toEndOfChapter?: boolean | undefined;
        };
        translationId?: string | undefined;
      }
    | {
        type: "html";
        html: string;
        title?: string | undefined;
      }
    | {
        type: "link";
        url: string;
        title?: string | undefined;
        embed?: boolean | undefined;
      }
    | null
  >;
  hasNext: ReadonlySignal<boolean>;
  hasPrevious: ReadonlySignal<boolean>;
  tab: ReaderTab | null;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  jumpTo: (index: number) => Promise<void>;
  addToQueue: (item: PlaylistItemData) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (from: number, to: number) => void;
  reset: () => Promise<void>;
  setState: (state: PlaylistReadingData) => Promise<void>;
  dispose: () => void;
};
export declare function createPlaylistManager(
  os: CasualOSManager,
  login: LoginManager,
  tabs: TabsManager,
  navigation: NavigationManager,
  isMobile: ReadonlySignal<boolean>,
  modals: ModalManager,
  i18n: I18nManager,
  readingExtensionManager: BibleReadingExtensionManager
): {
  savePlaylist: (playlist: Playlist) => Promise<void>;
  deletePlaylist: (playlist: Playlist) => Promise<void>;
  createNewPlaylist: () => Promise<void>;
  editPlaylist: (playlist: Playlist) => void;
  saveEditingPlaylist: () => Promise<void>;
  addEditingPlaylistItem: (item: PlaylistItemData) => void;
  updateEditingPlaylistItem: (index: number, item: PlaylistItemData) => void;
  removeEditingPlaylistItem: (index: number) => void;
  reorderEditingPlaylistItem: (from: number, to: number) => void;
  cancelEditingPlaylist: () => void;
  listPlaylists: (recordName: string) => Promise<
    {
      id: string;
      recordName: string;
      authorUserId: string;
      title: string | null;
      description: string | null;
      items: (
        | {
            type: "bible-verse";
            ref: {
              bookId: string;
              chapter: number;
              endChapter?: number | undefined;
              verse?: number | undefined;
              endVerse?: number | undefined;
              toEndOfChapter?: boolean | undefined;
            };
            translationId?: string | undefined;
          }
        | {
            type: "html";
            html: string;
            title?: string | undefined;
          }
        | {
            type: "link";
            url: string;
            title?: string | undefined;
            embed?: boolean | undefined;
          }
      )[];
      createdAtMs: number;
      updatedAtMs: number;
    }[]
  >;
  loadPlaylist: (recordName: string, id: string) => Promise<Playlist>;
  userPlaylists: Signal<
    {
      id: string;
      recordName: string;
      authorUserId: string;
      title: string | null;
      description: string | null;
      items: (
        | {
            type: "bible-verse";
            ref: {
              bookId: string;
              chapter: number;
              endChapter?: number | undefined;
              verse?: number | undefined;
              endVerse?: number | undefined;
              toEndOfChapter?: boolean | undefined;
            };
            translationId?: string | undefined;
          }
        | {
            type: "html";
            html: string;
            title?: string | undefined;
          }
        | {
            type: "link";
            url: string;
            title?: string | undefined;
            embed?: boolean | undefined;
          }
      )[];
      createdAtMs: number;
      updatedAtMs: number;
    }[]
  >;
  availablePlaylists: ReadonlySignal<
    Signal<
      {
        id: string;
        recordName: string;
        authorUserId: string;
        title: string | null;
        description: string | null;
        items: (
          | {
              type: "bible-verse";
              ref: {
                bookId: string;
                chapter: number;
                endChapter?: number | undefined;
                verse?: number | undefined;
                endVerse?: number | undefined;
                toEndOfChapter?: boolean | undefined;
              };
              translationId?: string | undefined;
            }
          | {
              type: "html";
              html: string;
              title?: string | undefined;
            }
          | {
              type: "link";
              url: string;
              title?: string | undefined;
              embed?: boolean | undefined;
            }
        )[];
        createdAtMs: number;
        updatedAtMs: number;
      }[]
    >
  >;
  view: Signal<"discover" | "create_playlist" | "play_playlist" | null>;
  actualView: ReadonlySignal<
    "discover" | "create_playlist" | "play_playlist" | null
  >;
  editingPlaylist: Signal<{
    id: string;
    recordName: string;
    authorUserId: string;
    title: string | null;
    description: string | null;
    items: (
      | {
          type: "bible-verse";
          ref: {
            bookId: string;
            chapter: number;
            endChapter?: number | undefined;
            verse?: number | undefined;
            endVerse?: number | undefined;
            toEndOfChapter?: boolean | undefined;
          };
          translationId?: string | undefined;
        }
      | {
          type: "html";
          html: string;
          title?: string | undefined;
        }
      | {
          type: "link";
          url: string;
          title?: string | undefined;
          embed?: boolean | undefined;
        }
    )[];
    createdAtMs: number;
    updatedAtMs: number;
  } | null>;
  playing: ReadonlySignal<{
    playlists: Signal<
      {
        id: string;
        recordName: string;
        authorUserId: string;
        title: string | null;
        description: string | null;
        items: (
          | {
              type: "bible-verse";
              ref: {
                bookId: string;
                chapter: number;
                endChapter?: number | undefined;
                verse?: number | undefined;
                endVerse?: number | undefined;
                toEndOfChapter?: boolean | undefined;
              };
              translationId?: string | undefined;
            }
          | {
              type: "html";
              html: string;
              title?: string | undefined;
            }
          | {
              type: "link";
              url: string;
              title?: string | undefined;
              embed?: boolean | undefined;
            }
        )[];
        createdAtMs: number;
        updatedAtMs: number;
      }[]
    >;
    queue: Signal<
      (
        | {
            type: "bible-verse";
            ref: {
              bookId: string;
              chapter: number;
              endChapter?: number | undefined;
              verse?: number | undefined;
              endVerse?: number | undefined;
              toEndOfChapter?: boolean | undefined;
            };
            translationId?: string | undefined;
          }
        | {
            type: "html";
            html: string;
            title?: string | undefined;
          }
        | {
            type: "link";
            url: string;
            title?: string | undefined;
            embed?: boolean | undefined;
          }
      )[]
    >;
    currentIndex: Signal<number>;
    currentItem: ReadonlySignal<
      | {
          type: "bible-verse";
          ref: {
            bookId: string;
            chapter: number;
            endChapter?: number | undefined;
            verse?: number | undefined;
            endVerse?: number | undefined;
            toEndOfChapter?: boolean | undefined;
          };
          translationId?: string | undefined;
        }
      | {
          type: "html";
          html: string;
          title?: string | undefined;
        }
      | {
          type: "link";
          url: string;
          title?: string | undefined;
          embed?: boolean | undefined;
        }
      | null
    >;
    hasNext: ReadonlySignal<boolean>;
    hasPrevious: ReadonlySignal<boolean>;
    tab: ReaderTab | null;
    next: () => Promise<void>;
    previous: () => Promise<void>;
    jumpTo: (index: number) => Promise<void>;
    addToQueue: (item: PlaylistItemData) => void;
    removeFromQueue: (index: number) => void;
    reorderQueue: (from: number, to: number) => void;
    reset: () => Promise<void>;
    setState: (state: PlaylistReadingData) => Promise<void>;
    dispose: () => void;
  } | null>;
  startPlaying: (
    playlist: Playlist | Playlist[],
    initialStep?: number
  ) => PlayingState | null;
  stopPlaying: () => void;
  getPlaylistUrl: (playlist: Playlist) => string;
  isDiscoverOpen: ReadonlySignal<boolean>;
  goBackFromPlayingView: () => void;
  isMobile: ReadonlySignal<boolean>;
};
