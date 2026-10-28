/**
 * `seed-bible/extensions`: the SDK a third-party extension is written against.
 *
 * It runs inside the extension's own sandboxed iframe, never in the Seed
 * Bible page, and reaches the app only by messages to the host's broker
 * (`managers/ExtensionSandboxManager.tsx`), which checks each one against the
 * permissions the user granted. It is bundled into every extension, so it
 * must not import anything from the app.
 */
import { effect, signal, type ReadonlySignal } from "@preact/signals";
import { render, type ComponentChild } from "preact";
import {
  SANDBOX_START_KEY,
  type SandboxCapture,
  type SandboxFriend,
  type SandboxChatRequest,
  type SandboxDiscoverRequest,
  type SandboxDiscoverResult,
  type SandboxErrorCode,
  type SandboxHighlight,
  type SandboxHostRequestKind,
  type SandboxNote,
  type SandboxProfile,
  type SandboxReadingEvent,
  type SandboxSave,
  type SandboxHostMessage,
  type SandboxIcon,
  type SandboxInit,
  type SandboxJsonValue,
  type SandboxMethod,
  type SandboxMethods,
  type SandboxPaneOptions,
  type SandboxPermission,
  type SandboxPlayback,
  type SandboxPortalOptions,
  type SandboxReadingPosition,
  type SandboxSelectedVerse,
  type SandboxSharedSession,
  type SandboxState,
  type SandboxTitle,
  type SandboxToolDefinition,
  type SandboxToolItem,
  type SandboxToolPatch,
  type SandboxToolSurface,
  type SandboxVerseRef,
} from "./protocol";

export type {
  SandboxChatMessage,
  SandboxChatRequest,
  SandboxDiscoverRequest,
  SandboxDiscoverResult,
  SandboxCasualOSPattern,
  SandboxFriend,
  SandboxHighlight,
  SandboxNote,
  SandboxProfile,
  SandboxReadingEvent,
  SandboxReference,
  SandboxSave,
  SandboxSessionParticipant,
} from "./protocol";
export type {
  SandboxIcon,
  SandboxJsonValue,
  SandboxPaneOptions,
  SandboxPermission,
  SandboxPlayback,
  SandboxPortalOptions,
  SandboxSharedSession,
  SandboxReadingPosition,
  SandboxSelectedVerse,
  SandboxTitle,
  SandboxVerseRef,
};
export { SANDBOX_PERMISSIONS, SANDBOX_PERMISSION_INFO } from "./protocol";

/**
 * Why a call to Seed Bible failed. Every `sb.*` promise rejects with one of
 * these when the app refuses or can't complete the call.
 *
 * - `permission_denied`: the call needs a permission that isn't granted.
 * - `invalid_request`: bad arguments, a main-only call from a view, or a call
 *   that needs a user interaction made at another time. `message` says which.
 * - `not_found`: the pane, note, save or narration named doesn't exist.
 * - `limit_exceeded`: too many tools or panes, storage full, a dialog
 *   already open, or a response too large.
 * - `unavailable`: not possible right now (signed out, a service failed, a
 *   device couldn't be used, no reader open).
 * - `internal`: a bug in Seed Bible itself.
 *
 * @example
 * try {
 *   await sb.notes.create({ bookId: "JHN", chapter: 3, text: "…" });
 * } catch (err) {
 *   if (err instanceof SandboxError && err.code === "unavailable") {
 *     void sb.app.toast("Sign in to save notes.");
 *   }
 * }
 */
export class SandboxError extends Error {
  /** Which way the call failed; see {@link SandboxError}. */
  readonly code: SandboxErrorCode;

  constructor(code: SandboxErrorCode, message: string) {
    super(message);
    this.name = "SandboxError";
    this.code = code;
  }
}

/** What a tool's `onSelect` is called with. */
export interface SandboxToolSelectContext {
  /** The selected verses. Empty unless `reading:selection` is granted. */
  selection: SandboxSelectedVerse[];
}

type ToolFlag = boolean | ReadonlySignal<boolean>;

/** One entry in a tool's submenu (`SandboxToolOptions.items`). */
export interface SandboxToolItemOptions {
  /** Unique within the tool: letters, digits, `_`, `.` or `-`, up to 64. */
  id: string;
  title: SandboxTitle;
  icon?: SandboxIcon;
  isDisabled?: boolean;
  /**
   * Called when the user picks this entry. Counts as a user interaction, so
   * it may open dialogs, copy, play audio or ask for permissions.
   */
  onSelect: (context: SandboxToolSelectContext) => void | Promise<void>;
}

/** A button registered with one of the `sb.tools.register…` methods. */
export interface SandboxToolOptions {
  /**
   * Unique within this extension: letters, digits, `_`, `.` or `-`, up to
   * 64. Registering again with the same id replaces the tool.
   */
  id: string;
  /** The button's label or tooltip. */
  title: SandboxTitle;
  /** A Material Symbols name (`{ material: "palette" }`) or an inline SVG. */
  icon: SandboxIcon;
  /**
   * Lower comes first; defaults to 500. Clamped by the host to 200–999, so
   * it always comes after the app's own tools.
   */
  priority?: number;
  /** A signal keeps the host up to date as it changes. Defaults to visible. */
  isVisible?: ToolFlag;
  /** A signal keeps the host up to date as it changes. */
  isDisabled?: ToolFlag;
  /**
   * Called when the user selects the tool. Counts as a user interaction, so
   * it may open dialogs, copy, play audio or ask for permissions. Errors it
   * throws are logged, not shown. Mutually exclusive with `items`.
   */
  onSelect?: (context: SandboxToolSelectContext) => void | Promise<void>;
  /** A submenu of 1–20 entries, instead of `onSelect`. */
  items?: SandboxToolItemOptions[];
}

/** Returned by the `sb.tools.register…` methods. */
export interface SandboxToolHandle {
  /**
   * Changes any field but `id` and `onSelect`. Passing `items` replaces the
   * whole submenu, handlers included.
   */
  update: (
    patch: Partial<Omit<SandboxToolOptions, "id" | "onSelect">>
  ) => Promise<void>;
  /** Removes the button. */
  unregister: () => Promise<void>;
}

/** Returned by `sb.portals.open`: a pane handle, plus messaging. */
export interface SandboxPortalHandle extends SandboxPaneHandle {
  /**
   * Sends a JSON message (at most 64 KB) into the portal's CasualOS
   * instance. Rejects with `unavailable` until the portal has loaded.
   */
  send: (message: SandboxJsonValue) => Promise<void>;
  /** Called with each message the pattern sends with `os.sendEmbedMessage`. */
  onMessage: (listener: (message: unknown) => void) => void;
}

/** Returned by `sb.panes.open`. */
export interface SandboxPaneHandle {
  /** The pane's id, for `sb.panes.close`. */
  paneId: string;
  /** Closes the pane. */
  close: () => Promise<void>;
  /** Called once when the pane closes, however it closed. */
  onClose: (listener: () => void) => void;
}

/**
 * The API a sandboxed extension uses to reach Seed Bible, handed to `main`
 * and to every view as `sb`.
 *
 * Each method sends a message to the app, which checks it against the
 * permissions the user granted, so nearly all of them return a promise that
 * rejects with a {@link SandboxError} when refused. Values that change while
 * the extension runs are signals: read `.value`, inside a component or an
 * `effect`, to follow them.
 *
 * Some calls are marked "Main code only": they reject with
 * `invalid_request` when called from a view. Some are marked "Only right
 * after the user interacts with this extension": call them from a tool's
 * `onSelect` or a click in one of your views, or they reject with
 * `invalid_request`.
 *
 * Full reference: `docs/extension-api.md` in the seed-bible repository.
 */
export interface SandboxContext {
  /**
   * The id Seed Bible knows this extension by: the folder its bundle is
   * hosted in, `#`, and the `id` from `extension.json`, like
   * `https://example.com/extensions/#verse-art`.
   */
  extensionId: string;
  /** What the user has granted, and a way to ask for optional permissions. */
  permissions: {
    /**
     * What the user has granted so far, including what those imply
     * (`highlights:write` includes `highlights:read`).
     */
    granted: ReadonlySignal<readonly SandboxPermission[]>;
    /** What `extension.json` lists under `optionalPermissions`. */
    optional: readonly SandboxPermission[];
    /**
     * Whether `permission` is granted right now. Check it when a feature
     * runs, not once at startup: the user can change optional permissions
     * in Settings (which restarts the extension).
     */
    has: (permission: SandboxPermission) => boolean;
    /**
     * Asks the user for one or more of the extension's `optionalPermissions`,
     * and resolves true if all of them are granted. Resolves true without
     * asking when they already are, and false without asking if the user
     * already declined one of them since the page loaded.
     *
     * The user is only asked right after they interact with this extension
     * (by selecting one of its tools, or inside one of its panes), so call it
     * from the click handler of the feature that needs it. Otherwise it
     * rejects with an `invalid_request` `SandboxError`, as it does for a
     * permission not listed under `optionalPermissions`.
     *
     * @example
     * onSelect: async () => {
     *   if (await sb.permissions.request("clipboard:write")) {
     *     await sb.clipboard.writeText("John 3:16");
     *   }
     * }
     */
    request: (
      permissions: SandboxPermission | SandboxPermission[]
    ) => Promise<boolean>;
  };
  /** The extension's own translations, from `extension.json`. */
  i18n: {
    /** The app's current language code, like `"en"` or `"es"`. */
    language: ReadonlySignal<string>;
    /** The current language's text direction. Already set on `<html>`. */
    direction: ReadonlySignal<"ltr" | "rtl">;
    /**
     * Looks `key` up in this extension's own `extension.json` translations
     * for the current language (falling back to `en`, then `defaultValue`,
     * then `key`), and fills `{{name}}` placeholders from `values`.
     *
     * @example
     * sb.i18n.t("found", "Found {{count}} verses", { count: 3 });
     */
    t: (
      key: string,
      defaultValue?: string,
      values?: Record<string, string | number>
    ) => string;
  };
  /** The app itself. */
  app: {
    /** Whether the app is in its phone layout. */
    isMobile: ReadonlySignal<boolean>;
    /**
     * Shows a short message (1–300 characters), prefixed with this
     * extension's name.
     */
    toast: (message: string) => Promise<void>;
  };
  /** What the user is reading. */
  reading: {
    /**
     * The passage in the reader in view; any field is null before something
     * is open. Null unless `reading:position` is granted.
     */
    position: ReadonlySignal<SandboxReadingPosition | null>;
    /** The verses the user has selected. Empty unless `reading:selection` is granted. */
    selection: ReadonlySignal<SandboxSelectedVerse[]>;
    /**
     * Moves the reader to a book and chapter, scrolled to `verse` if given.
     * Needs `reading:navigate`.
     */
    open: (ref: SandboxVerseRef) => Promise<void>;
  };
  /**
   * Buttons in the app's toolbars. Main code only. At most 20 per extension
   * (`limit_exceeded` past that).
   *
   * @example
   * await sb.tools.registerToolbarTool({
   *   id: "art",
   *   title: { key: "make-art", defaultValue: "Make art" },
   *   icon: { material: "palette" },
   *   onSelect: () =>
   *     void sb.panes.open({ view: "art", placement: "side", title: "Art" }),
   * });
   */
  tools: {
    /** A button in the reader's main toolbar. */
    registerToolbarTool: (
      tool: SandboxToolOptions
    ) => Promise<SandboxToolHandle>;
    /**
     * A button in the toolbar shown when the user selects verses. Its
     * `onSelect` gets the selection if `reading:selection` is granted.
     */
    registerVerseToolbarTool: (
      tool: SandboxToolOptions
    ) => Promise<SandboxToolHandle>;
    /** A compact icon in the row above the reader. */
    registerQuickTool: (tool: SandboxToolOptions) => Promise<SandboxToolHandle>;
    /** A button below the chapter text. */
    registerBelowReaderTool: (
      tool: SandboxToolOptions
    ) => Promise<SandboxToolHandle>;
  };
  /**
   * Panes (the app's windows) showing one of your `views`. The host draws
   * the frame: title, close button and a badge with the extension's name.
   * At most 5 open at once, portals included.
   */
  panes: {
    /**
     * Opens one of your `views` in a pane. Opening with the `id` of a pane
     * that's already open replaces its content instead of opening another.
     * Rejects with `limit_exceeded` past 5 open panes.
     */
    open: (options: SandboxPaneOptions) => Promise<SandboxPaneHandle>;
    /** Closes one of this extension's panes; `not_found` if it isn't open. */
    close: (paneId: string) => Promise<void>;
  };
  /**
   * A small key/value store of this extension's own, kept by the host. A
   * sandboxed frame has no `localStorage` of its own. At most 256 KB in all
   * (`limit_exceeded` past that); keys up to 200 characters. Synced to the
   * user's account while they're signed in (the later write to a key wins),
   * kept on the device while signed out, and deleted on uninstall. Needs no
   * permission. Don't keep secrets here: use sensitive settings.
   */
  storage: {
    /** The value stored under `key`, or null if there isn't one. */
    get: <T extends SandboxJsonValue = SandboxJsonValue>(
      key: string
    ) => Promise<T | null>;
    /** Stores any JSON value under `key`, replacing what was there. */
    set: (key: string, value: SandboxJsonValue) => Promise<void>;
    /** Removes `key`; does nothing if it isn't set. */
    remove: (key: string) => Promise<void>;
    /** Every key that's set. */
    keys: () => Promise<string[]>;
  };
  /** This extension's own (non-sensitive) settings from `extension.json`. */
  settings: {
    /**
     * The setting's current value: the user's own, else the active
     * Customization's default, else its `default` in `extension.json`, else
     * null. Always null for a sensitive setting or an undeclared key. Not
     * pushed on change, so read it again when you need it.
     */
    get: (key: string) => Promise<string | number | boolean | null>;
    /**
     * Shows one of your `views` as this extension's settings, on its
     * Settings tab in Settings → Extensions, with `surface: "settings"`.
     * Calling it again replaces the panel. Main code only.
     */
    registerPanel: (view: string) => Promise<void>;
  };
  /**
   * An id for the signed-in user that's the same every time for this
   * extension but different for every extension, and isn't their real id.
   * Null when signed out. Needs no permission. A friend's or session
   * participant's `id` is that person's `identity` in this extension.
   */
  identity: ReadonlySignal<string | null>;
  /** Public Bible text. Needs no permission. */
  bible: {
    /**
     * Each verse of a chapter as plain text (no section headings). Rejects
     * with `unavailable` if the translation or chapter can't be loaded.
     *
     * @example
     * const { verses } = await sb.bible.chapter({
     *   translationId: "BSB",
     *   bookId: "JHN",
     *   chapter: 3,
     * });
     */
    chapter: (ref: {
      translationId: string;
      bookId: string;
      chapter: number;
    }) => Promise<{ verses: { number: number; text: string }[] }>;
  };
  /** Reading needs `highlights:read`; adding and removing, `highlights:write`. */
  highlights: {
    /**
     * The highlight color ids the current theme has, for `add`'s `colorId`.
     * Needs no permission.
     */
    colors: () => Promise<string[]>;
    /** The chapter's highlights. Needs `highlights:read`. */
    list: (ref: ChapterRef) => Promise<SandboxHighlight[]>;
    /**
     * Highlights 1–200 verses in one of `colors()`; any other `colorId`
     * rejects with `invalid_request`. Needs `highlights:write`.
     */
    add: (
      ref: ChapterRef & { verses: number[]; colorId: string }
    ) => Promise<void>;
    /** Removes the highlight from those verses. Needs `highlights:write`. */
    remove: (ref: ChapterRef & { verses: number[] }) => Promise<void>;
  };
  /**
   * Reading needs `notes:read`; writing, `notes:write`. Notes are plain text
   * here. An extension can only change or delete the notes it added.
   * Writing needs the user to be signed in (`unavailable` otherwise).
   */
  notes: {
    /** The chapter's notes; empty when signed out. Needs `notes:read`. */
    list: (ref: { bookId: string; chapter: number }) => Promise<SandboxNote[]>;
    /**
     * Adds a note (1–10,000 characters) on `verses`, or the whole chapter
     * without them, marked as this extension's. Blank lines become
     * paragraphs. Needs `notes:write`.
     */
    create: (note: {
      bookId: string;
      chapter: number;
      verses?: number[];
      text: string;
    }) => Promise<{ id: string }>;
    /**
     * Replaces the text of a note this extension added. `permission_denied`
     * for anyone else's note; `not_found` if it isn't in that chapter.
     * Needs `notes:write`.
     */
    update: (note: {
      id: string;
      bookId: string;
      chapter: number;
      text: string;
    }) => Promise<void>;
    /**
     * Deletes a note this extension added, with the same rules as
     * `update`. Needs `notes:write`.
     */
    delete: (note: {
      id: string;
      bookId: string;
      chapter: number;
    }) => Promise<void>;
  };
  /** Reading needs `saves:read`; writing, `saves:write` and a signed-in user. */
  saves: {
    /** Every save (bookmark) the user has. Needs `saves:read`. */
    list: () => Promise<SandboxSave[]>;
    /**
     * Saves a chapter, a verse or an inclusive `[start, end]` range, in up
     * to 10 categories. Needs `saves:write`; `unavailable` when signed out.
     */
    add: (
      save: ChapterRef & {
        verse?: number | [number, number];
        categories?: string[];
      }
    ) => Promise<void>;
    /**
     * Removes a save by its id; `not_found` if there isn't one. Needs
     * `saves:write`; `unavailable` when signed out.
     */
    remove: (id: string) => Promise<void>;
  };
  /** Needs `reading:history`. Times in ms since the epoch, at most a year apart. */
  history: {
    /**
     * The chapters the user read between `from` and `to`, one event per
     * sitting, up to 5,000.
     *
     * @example
     * const lastWeek = await sb.history.list({
     *   from: Date.now() - 7 * 24 * 60 * 60 * 1000,
     *   to: Date.now(),
     * });
     */
    list: (range: {
      from: number;
      to: number;
    }) => Promise<SandboxReadingEvent[]>;
  };
  /**
   * Needs `profile:read`. Null when signed out. Includes the user's real
   * account id; to tell users apart without it, use `identity`.
   */
  profile: { get: () => Promise<SandboxProfile | null> };
  /**
   * Needs `friends:read`. Empty when signed out. Ids are pseudonymous like
   * `identity`: a friend's id here is their own `identity` in this extension.
   */
  friends: { list: () => Promise<SandboxFriend[]> };
  /**
   * The shared reading session open in the current tab, kept up to date.
   * Null when there isn't one, and always null without `session:read`.
   */
  session: { current: ReadonlySignal<SandboxSharedSession | null> };
  /**
   * The app's audio player: what's played here shows in the reader's
   * playback controls for the tab in view, where the user can pause, scrub
   * and stop it, and it pauses whatever else the app was playing. One thing
   * at a time; playing another replaces it. Needs `audio:playback`.
   *
   * Starting or resuming playback only works right after the user interacts
   * with this extension. Each `play…` resolves when playback ends:
   * `finished` is false if it was stopped (by `stop()`, the user, something
   * else playing there, or the tab closing) rather than played to the end.
   * Calls reject with `unavailable` when no reader is open to play in.
   */
  audio: {
    /** An audio file from one of the manifest's `network` hosts (`https:`). */
    play: (url: string) => Promise<{ finished: boolean }>;
    /**
     * The app's recorded narration of a chapter, by `reader` (see
     * `narrators`), or the first there is. Rejects with `not_found` when
     * the chapter has none; fall back to `readAloud`.
     */
    playNarration: (
      ref: ChapterRef & { reader?: string }
    ) => Promise<{ finished: boolean }>;
    /** Who has recorded narration for a chapter; empty when no one has. */
    narrators: (ref: ChapterRef) => Promise<string[]>;
    /**
     * Reads a chapter, or verses `fromVerse` to `toVerse` of it, with the
     * app's text-to-speech.
     */
    readAloud: (
      ref: ChapterRef & { fromVerse?: number; toVerse?: number }
    ) => Promise<{ finished: boolean }>;
    /** Pauses what this extension is playing. */
    pause: () => Promise<void>;
    /** Resumes it. Only right after the user interacts with this extension. */
    resume: () => Promise<void>;
    /** Seconds, or for `readAloud`, a verse index. */
    seek: (position: number) => Promise<void>;
    /** Stops what this extension is playing; its `play…` resolves unfinished. */
    stop: () => Promise<void>;
    /** What this extension is playing; null when nothing is. */
    playback: ReadonlySignal<SandboxPlayback | null>;
  };
  /** Needs `clipboard:write`. Only right after the user interacts with this extension. */
  clipboard: {
    /** Copies up to 100,000 characters of text. */
    writeText: (text: string) => Promise<void>;
  };
  /**
   * CasualOS grid and map portals (`ao.bot` patterns), each in a pane the
   * host draws. Needs `embed:casualos`. The pattern runs on `ao.bot`,
   * outside the sandbox.
   */
  portals: {
    /**
     * Opens a portal in a pane. Counts toward the 5 open panes.
     *
     * @example
     * const portal = await sb.portals.open({
     *   pattern: { name: "my-pattern" },
     *   portalType: "map",
     *   placement: "side",
     *   title: "Map",
     * });
     * portal.onMessage((message) => console.log(message));
     */
    open: (options: SandboxPortalOptions) => Promise<SandboxPortalHandle>;
  };
  /**
   * The microphone and camera, through a dialog the host shows: the user
   * sees which extension is asking, presses the button themselves, and the
   * extension gets only the result. Only right after the user interacts
   * with this extension, one dialog at a time. Each resolves null if the
   * user cancels, and rejects with `unavailable` if the device can't be used.
   */
  devices: {
    /** Needs `device:microphone`. At most `maxSeconds` (default 60, up to 300). */
    recordAudio: (options?: { maxSeconds?: number }) => Promise<Blob | null>;
    /** Needs `device:camera`. A JPEG. */
    takePhoto: () => Promise<Blob | null>;
  };
  /**
   * Content for the Discover panel. Registering needs `reading:position`,
   * since a provider is told which chapter is open. Main code only.
   */
  discover: {
    /**
     * Adds a provider the Discover panel asks for results whenever it needs
     * them. `discover` must answer within 5 seconds with up to 50 results;
     * otherwise, or if it throws, the provider shows nothing that time.
     */
    registerProvider: (provider: {
      /** Unique within this extension. */
      id: string;
      /** Up to 100 characters. */
      title: string;
      /** Up to 300 characters. */
      description: string;
      /** Returns results for the chapter in `request`, as data. */
      discover: (
        request: SandboxDiscoverRequest
      ) => SandboxDiscoverResult[] | Promise<SandboxDiscoverResult[]>;
      /**
       * Called with a `content` result's `id` when the user picks it. Not a
       * user interaction, so open a pane from it rather than a dialog.
       */
      onSelect?: (resultId: string) => void;
    }) => Promise<{ unregister: () => Promise<void> }>;
  };
  /**
   * A chat participant. Needs `chat:respond`; `shared: true` also needs
   * `chat:shared`. Main code only.
   */
  chats: {
    /**
     * Adds a participant the user can add to their chats. It only sees the
     * chats it's added to. `respond` has 60 seconds to answer; past that,
     * or if it throws, it says nothing that time.
     */
    registerProvider: (provider: {
      /** Unique within this extension. */
      id: string;
      /** Shown as the participant's name; up to 100 characters. */
      name: string;
      /** May be added to chats with other people. Needs `chat:shared`. */
      shared?: boolean;
      /**
       * Returns the reply (one whole message, up to 20,000 characters
       * shown), or null to stay quiet. Gets the last 100 text messages.
       */
      respond: (
        request: SandboxChatRequest
      ) => string | null | Promise<string | null>;
    }) => Promise<{ unregister: () => Promise<void> }>;
  };
  /**
   * Dialogs, titled with the extension's name. Only right after the user
   * interacts with this extension, one at a time (`limit_exceeded`
   * otherwise). Each resolves when it's closed.
   */
  modals: {
    /** A message (up to 2,000 characters) with an OK button. */
    alert: (dialog: { title: string; message: string }) => Promise<void>;
    /** One of your `views`, shown with `surface: "modal"`. */
    open: (dialog: {
      title: string;
      view: string;
      props?: SandboxJsonValue;
    }) => Promise<void>;
  };
  /**
   * Requests that carry the user's sensitive settings, through the hosts
   * the manifest's `sensitive` section declares. The values never reach
   * the extension.
   */
  sensitive: {
    /**
     * Sends an `https:` request to a host the manifest's `sensitive` section
     * declares, with the user's sensitive values filled in by the server.
     * Resolves for any HTTP status, like `fetch`; `body` is the response
     * text, up to 1 MB (`limit_exceeded` past that). Rejects with
     * `unavailable` when it can't be sent; the message starts with why
     * (`signed_out`, `not_set`, `unknown_destination`,
     * `ambiguous_destination`, `invalid_url` or `request_failed`).
     *
     * @example
     * const response = await sb.sensitive.fetch({
     *   url: "https://api.example.com/v1/lookup",
     *   method: "POST",
     *   body: { reference: "JHN 3:16" },
     * });
     * const data = response.ok ? JSON.parse(response.body) : null;
     */
    fetch: (request: {
      url: string;
      /** Defaults to `GET`. */
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
      /** Sent as JSON; a string is sent as-is. Ignored for GET and HEAD. */
      body?: unknown;
      /** Which `sensitive` entry to use, if several declare the URL's host. */
      proxy?: string;
    }) => Promise<{
      status: number;
      ok: boolean;
      contentType: string | null;
      body: string;
    }>;
  };
}

/** A chapter of a particular translation. */
interface ChapterRef {
  /** A Free Use Bible API translation id, like `"BSB"`. */
  translationId: string;
  /** A three-letter USFM book code, like `"JHN"` or `"1CO"`. */
  bookId: string;
  /** Starting at 1. */
  chapter: number;
}

/** What each of an extension's `views` is rendered with. */
export interface SandboxViewProps {
  /** The API, for this view's own frame. */
  sb: SandboxContext;
  /** Whatever was passed as `props` when it was opened; null if nothing. */
  props: SandboxJsonValue;
  /** Where the view is shown. */
  surface: "pane" | "modal" | "settings";
  /** The pane this view is rendered in (an id for a modal or panel). */
  paneId: string;
}

/** What `defineExtension` takes. */
export interface SandboxExtensionDefinition {
  /**
   * Runs once in the extension's hidden background frame when it starts:
   * register tools and providers here. If it throws, the extension fails
   * to start. Don't wait on the user in it.
   */
  main?: (sb: SandboxContext) => void | Promise<void>;
  /**
   * The UI for each pane, dialog or settings panel the extension shows, by
   * name. Each renders in its own frame, with the app's theme and fonts
   * applied, and is destroyed when it closes. Styles must come from the
   * bundle (inline, or CSS imported with `?inline`).
   */
  views?: Record<string, (props: SandboxViewProps) => ComponentChild>;
}

export type SandboxExtension = SandboxExtensionDefinition & {
  [SANDBOX_START_KEY]: (port: MessagePort, init: SandboxInit) => Promise<void>;
};

interface ToolHandlers {
  onSelect?: SandboxToolOptions["onSelect"];
  items: Map<string, SandboxToolItemOptions["onSelect"]>;
  stopEffects: (() => void)[];
}

const toBlob = (capture: SandboxCapture | null) =>
  capture ? new Blob([capture.bytes], { type: capture.type }) : null;

function interpolate(
  text: string,
  values: Record<string, string | number> | undefined
): string {
  if (!values) {
    return text;
  }
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match
  );
}

function applyDocumentState(state: SandboxState) {
  if (typeof document === "undefined") {
    return;
  }
  let style = document.getElementById("sb-theme");
  if (!style) {
    style = document.createElement("style");
    style.id = "sb-theme";
    document.head.appendChild(style);
  }
  style.textContent = `:root {\n${state.themeCss}\n}\nhtml, body { margin: 0; background: var(--sb-background); color: var(--sb-font-color); font-family: var(--sb-font-family, system-ui, sans-serif); }`;
  const wanted = new Set(state.fontStylesheets);
  for (const link of document.head.querySelectorAll<HTMLLinkElement>(
    "link[data-sb-font]"
  )) {
    if (!wanted.delete(link.href)) {
      link.remove();
    }
  }
  for (const href of wanted) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.sbFont = "";
    document.head.appendChild(link);
  }
  document.documentElement.lang = state.language;
  document.documentElement.dir = state.direction;
}

/**
 * Connects to the host over `port` and builds the `sb` object an extension
 * uses. Exported for tests, which drive a frame without an iframe.
 */
export function createSandboxClient(port: MessagePort, init: SandboxInit) {
  const state = signal<SandboxState>(init.state);
  const granted = signal<readonly SandboxPermission[]>(init.granted);
  const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: unknown) => void }
  >();
  const toolHandlers = new Map<string, ToolHandlers>();
  const discoverProviders = new Map<
    string,
    Parameters<SandboxContext["discover"]["registerProvider"]>[0]
  >();
  const chatProviders = new Map<
    string,
    Parameters<SandboxContext["chats"]["registerProvider"]>[0]
  >();
  const hostRequestHandlers: {
    [K in SandboxHostRequestKind]?: (payload: unknown) => unknown;
  } = {
    discover: (payload) => {
      const request = payload as SandboxDiscoverRequest;
      const provider = discoverProviders.get(request.providerId);
      if (!provider) {
        throw new Error(`No Discover provider '${request.providerId}'.`);
      }
      return provider.discover(request);
    },
    chat: (payload) => {
      const request = payload as SandboxChatRequest;
      const provider = chatProviders.get(request.providerId);
      if (!provider) {
        throw new Error(`No chat provider '${request.providerId}'.`);
      }
      return provider.respond(request);
    },
  };
  const paneCloseListeners = new Map<string, (() => void)[]>();
  const portalListeners = new Map<string, ((message: unknown) => void)[]>();
  let nextId = 1;

  const call = <M extends SandboxMethod>(
    method: M,
    params: SandboxMethods[M]["params"]
  ): Promise<SandboxMethods[M]["result"]> =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      port.postMessage({ type: "call", id, method, params });
    });

  const runHandler = (
    handler: ((context: SandboxToolSelectContext) => unknown) | undefined,
    selection: SandboxSelectedVerse[]
  ) => {
    if (!handler) {
      return;
    }
    Promise.resolve()
      .then(() => handler({ selection }))
      .catch((err) => console.error("Tool handler failed:", err));
  };

  port.onmessage = (event: MessageEvent<SandboxHostMessage>) => {
    const message = event.data;
    if (message.type === "result") {
      const entry = pending.get(message.id);
      if (!entry) {
        return;
      }
      pending.delete(message.id);
      if (message.ok) {
        entry.resolve(message.value);
      } else {
        entry.reject(
          new SandboxError(message.error.code, message.error.message)
        );
      }
    } else if (message.type === "ping") {
      void call("pong", {}).catch(() => {});
    } else if (message.type === "permissions") {
      granted.value = message.granted;
    } else if (message.type === "state") {
      state.value = { ...state.value, ...message.state };
      applyDocumentState(state.value);
    } else if (message.name === "tool.select") {
      const handlers = toolHandlers.get(message.toolId);
      runHandler(
        message.itemId === null
          ? handlers?.onSelect
          : handlers?.items.get(message.itemId),
        message.selection
      );
    } else if (message.name === "request") {
      const handler = hostRequestHandlers[message.kind];
      Promise.resolve()
        .then(() => {
          if (!handler) {
            throw new Error(`Nothing handles '${message.kind}'.`);
          }
          return handler(message.payload);
        })
        .then(
          (value) => call("respond", { requestId: message.requestId, value }),
          (err: unknown) =>
            call("respond", {
              requestId: message.requestId,
              error: String(err),
            })
        )
        .catch((err) => console.error("Couldn't answer the host:", err));
    } else if (message.name === "discover.select") {
      discoverProviders.get(message.providerId)?.onSelect?.(message.resultId);
    } else if (message.name === "portal.message") {
      for (const listener of portalListeners.get(message.paneId) ?? []) {
        listener(message.message);
      }
    } else if (message.name === "pane.closed") {
      portalListeners.delete(message.paneId);
      const listeners = paneCloseListeners.get(message.paneId) ?? [];
      paneCloseListeners.delete(message.paneId);
      for (const listener of listeners) {
        listener();
      }
    }
  };
  port.start();
  applyDocumentState(init.state);

  const position = signal(init.state.position);
  const selection = signal(init.state.selection);
  const isMobile = signal(init.state.isMobile);
  const identity = signal(init.state.identity);
  const language = signal(init.state.language);
  const direction = signal(init.state.direction);
  const session = signal(init.state.session);
  const playback = signal(init.state.playback);
  effect(() => {
    session.value = state.value.session;
    playback.value = state.value.playback;
    position.value = state.value.position;
    selection.value = state.value.selection;
    isMobile.value = state.value.isMobile;
    identity.value = state.value.identity;
    language.value = state.value.language;
    direction.value = state.value.direction;
  });

  const readFlag = (flag: ToolFlag | undefined) =>
    flag === undefined || typeof flag === "boolean" ? flag : flag.peek();

  const toItems = (items: SandboxToolItemOptions[]): SandboxToolItem[] =>
    items.map((item) => ({
      id: item.id,
      title: item.title,
      icon: item.icon,
      disabled: item.isDisabled,
    }));

  const registerTool =
    (surface: SandboxToolSurface) =>
    async (tool: SandboxToolOptions): Promise<SandboxToolHandle> => {
      if (tool.onSelect && tool.items) {
        throw new SandboxError(
          "invalid_request",
          `Tool "${tool.id}" cannot define both onSelect and items.`
        );
      }
      const handlers: ToolHandlers = {
        onSelect: tool.onSelect,
        items: new Map(tool.items?.map((item) => [item.id, item.onSelect])),
        stopEffects: [],
      };
      toolHandlers.set(tool.id, handlers);

      const definition: SandboxToolDefinition = {
        id: tool.id,
        surface,
        title: tool.title,
        icon: tool.icon,
        priority: tool.priority,
        visible: readFlag(tool.isVisible),
        disabled: readFlag(tool.isDisabled),
        items: tool.items ? toItems(tool.items) : undefined,
      };
      await call("tools.register", definition);

      const update = async (
        patch: Partial<Omit<SandboxToolOptions, "id" | "onSelect">>
      ) => {
        if (patch.items) {
          handlers.items = new Map(
            patch.items.map((item) => [item.id, item.onSelect])
          );
        }
        const wire: SandboxToolPatch = {};
        if (patch.title !== undefined) wire.title = patch.title;
        if (patch.icon !== undefined) wire.icon = patch.icon;
        if (patch.priority !== undefined) wire.priority = patch.priority;
        if (patch.isVisible !== undefined)
          wire.visible = readFlag(patch.isVisible);
        if (patch.isDisabled !== undefined)
          wire.disabled = readFlag(patch.isDisabled);
        if (patch.items !== undefined) wire.items = toItems(patch.items);
        await call("tools.update", { id: tool.id, patch: wire });
      };

      // Signals passed as flags keep the host's copy current. The first run
      // only subscribes: `definition` already carried the starting value.
      for (const [flag, key] of [
        [tool.isVisible, "visible"],
        [tool.isDisabled, "disabled"],
      ] as const) {
        if (flag === undefined || typeof flag === "boolean") {
          continue;
        }
        let first = true;
        handlers.stopEffects.push(
          effect(() => {
            const value = flag.value;
            if (first) {
              first = false;
              return;
            }
            void call("tools.update", {
              id: tool.id,
              patch: { [key]: value },
            }).catch((err) => console.error("Tool update failed:", err));
          })
        );
      }

      return {
        update,
        unregister: async () => {
          for (const stop of handlers.stopEffects) {
            stop();
          }
          toolHandlers.delete(tool.id);
          await call("tools.unregister", { id: tool.id });
        },
      };
    };

  const paneHandle = (paneId: string): SandboxPaneHandle => ({
    paneId,
    close: () => call("panes.close", { paneId }).then(() => {}),
    onClose: (listener) => {
      const listeners = paneCloseListeners.get(paneId) ?? [];
      listeners.push(listener);
      paneCloseListeners.set(paneId, listeners);
    },
  });

  const sb: SandboxContext = {
    extensionId: init.extensionId,
    permissions: {
      granted,
      optional: init.optional,
      has: (permission) => granted.value.includes(permission),
      request: async (permissions) => {
        const { granted: allGranted } = await call("permissions.request", {
          permissions: Array.isArray(permissions) ? permissions : [permissions],
        });
        return allGranted;
      },
    },
    i18n: {
      language,
      direction,
      t: (key, defaultValue, values) =>
        interpolate(state.value.strings[key] ?? defaultValue ?? key, values),
    },
    app: {
      isMobile,
      toast: (message) => call("app.toast", { message }).then(() => {}),
    },
    reading: {
      position,
      selection,
      open: (ref) => call("reading.open", ref).then(() => {}),
    },
    tools: {
      registerToolbarTool: registerTool("toolbar"),
      registerVerseToolbarTool: registerTool("verse"),
      registerQuickTool: registerTool("quick"),
      registerBelowReaderTool: registerTool("belowReader"),
    },
    panes: {
      open: async (options) =>
        paneHandle((await call("panes.open", options)).paneId),
      close: (paneId) => call("panes.close", { paneId }).then(() => {}),
    },
    storage: {
      get: <T extends SandboxJsonValue = SandboxJsonValue>(key: string) =>
        call("storage.get", { key }) as Promise<T | null>,
      set: (key, value) => call("storage.set", { key, value }).then(() => {}),
      remove: (key) => call("storage.remove", { key }).then(() => {}),
      keys: () => call("storage.keys", {}),
    },
    settings: {
      get: (key) => call("settings.get", { key }),
      registerPanel: (view) =>
        call("settings.registerPanel", { view }).then(() => {}),
    },
    identity,
    bible: {
      chapter: (ref) => call("bible.chapter", ref),
    },
    highlights: {
      colors: () => call("highlights.colors", {}),
      list: (ref) => call("highlights.list", ref),
      add: (highlight) => call("highlights.add", highlight).then(() => {}),
      remove: (ref) => call("highlights.remove", ref).then(() => {}),
    },
    notes: {
      list: (ref) => call("notes.list", ref),
      create: (note) => call("notes.create", note),
      update: (note) => call("notes.update", note).then(() => {}),
      delete: (note) => call("notes.delete", note).then(() => {}),
    },
    saves: {
      list: () => call("saves.list", {}),
      add: (save) => call("saves.add", save).then(() => {}),
      remove: (id) => call("saves.remove", { id }).then(() => {}),
    },
    history: {
      list: (range) => call("history.list", range),
    },
    profile: {
      get: () => call("profile.get", {}),
    },
    discover: {
      registerProvider: async (provider) => {
        discoverProviders.set(provider.id, provider);
        await call("discover.register", {
          id: provider.id,
          title: provider.title,
          description: provider.description,
        }).catch((err: unknown) => {
          discoverProviders.delete(provider.id);
          throw err;
        });
        return {
          unregister: async () => {
            discoverProviders.delete(provider.id);
            await call("discover.unregister", { id: provider.id });
          },
        };
      },
    },
    chats: {
      registerProvider: async (provider) => {
        chatProviders.set(provider.id, provider);
        await call("chats.register", {
          id: provider.id,
          name: provider.name,
          shared: provider.shared,
        }).catch((err: unknown) => {
          chatProviders.delete(provider.id);
          throw err;
        });
        return {
          unregister: async () => {
            chatProviders.delete(provider.id);
            await call("chats.unregister", { id: provider.id });
          },
        };
      },
    },
    modals: {
      alert: (dialog) => call("modals.open", dialog).then(() => {}),
      open: (dialog) => call("modals.open", dialog).then(() => {}),
    },
    sensitive: {
      fetch: (request) => call("sensitive.fetch", request),
    },
    friends: {
      list: () => call("friends.list", {}),
    },
    session: { current: session },
    audio: {
      play: (url) => call("audio.play", { url }),
      playNarration: (ref) => call("audio.playNarration", ref),
      narrators: (ref) => call("audio.narrators", ref),
      readAloud: (ref) => call("audio.readAloud", ref),
      pause: () => call("audio.pause", {}).then(() => {}),
      resume: () => call("audio.resume", {}).then(() => {}),
      seek: (position) => call("audio.seek", { position }).then(() => {}),
      stop: () => call("audio.stop", {}).then(() => {}),
      playback,
    },
    clipboard: {
      writeText: (text) => call("clipboard.writeText", { text }).then(() => {}),
    },
    portals: {
      open: async (options) => {
        const { paneId } = await call("portals.open", options);
        return {
          ...paneHandle(paneId),
          send: (message) =>
            call("portals.send", { paneId, message }).then(() => {}),
          onMessage: (listener) => {
            const listeners = portalListeners.get(paneId) ?? [];
            listeners.push(listener);
            portalListeners.set(paneId, listeners);
          },
        };
      },
    },
    devices: {
      recordAudio: (options) =>
        call("devices.recordAudio", options ?? {}).then(toBlob),
      takePhoto: () => call("devices.takePhoto", {}).then(toBlob),
    },
  };

  return { sb, call };
}

/**
 * Declares a sandboxed extension. Its module's default export must be the
 * value this returns:
 *
 * ```tsx
 * export default defineExtension({
 *   main: async (sb) => {
 *     await sb.tools.registerToolbarTool({
 *       id: "hello",
 *       title: "Hello",
 *       icon: { material: "waving_hand" },
 *       onSelect: () =>
 *         sb.panes.open({ view: "hello", placement: "side", title: "Hello" }),
 *     });
 *   },
 *   views: { hello: () => <p>Hello from a sandbox</p> },
 * });
 * ```
 */
export function defineExtension(
  definition: SandboxExtensionDefinition
): SandboxExtension {
  const start = async (port: MessagePort, init: SandboxInit) => {
    const { sb, call } = createSandboxClient(port, init);
    if (init.mode.kind === "view") {
      const { view, surface, paneId, props } = init.mode;
      const View = definition.views?.[view];
      const root =
        document.getElementById("root") ??
        document.body.appendChild(document.createElement("div"));
      if (!View) {
        root.textContent = `Unknown view "${view}".`;
        return;
      }
      try {
        render(
          <View sb={sb} props={props} surface={surface} paneId={paneId} />,
          root
        );
      } catch (err) {
        console.error(`Extension '${init.extensionId}' view "${view}":`, err);
        await call("ready", { error: String(err) });
      }
      return;
    }
    try {
      await definition.main?.(sb);
      await call("ready", {});
    } catch (err) {
      console.error(`Extension '${init.extensionId}' failed to start:`, err);
      await call("ready", { error: String(err) });
    }
  };
  return { ...definition, [SANDBOX_START_KEY]: start };
}
