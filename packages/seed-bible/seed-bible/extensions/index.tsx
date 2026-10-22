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

/** Why a call to the host failed; `code` says which way. */
export class SandboxError extends Error {
  readonly code: SandboxErrorCode;

  constructor(code: SandboxErrorCode, message: string) {
    super(message);
    this.name = "SandboxError";
    this.code = code;
  }
}

export interface SandboxToolSelectContext {
  /** The selected verses. Empty unless `reading:selection` is granted. */
  selection: SandboxSelectedVerse[];
}

type ToolFlag = boolean | ReadonlySignal<boolean>;

export interface SandboxToolItemOptions {
  id: string;
  title: SandboxTitle;
  icon?: SandboxIcon;
  isDisabled?: boolean;
  onSelect: (context: SandboxToolSelectContext) => void | Promise<void>;
}

export interface SandboxToolOptions {
  id: string;
  title: SandboxTitle;
  icon: SandboxIcon;
  /** Clamped by the host to 200–999, after the app's own tools. */
  priority?: number;
  /** A signal keeps the host up to date as it changes. */
  isVisible?: ToolFlag;
  isDisabled?: ToolFlag;
  /** Mutually exclusive with `items`. */
  onSelect?: (context: SandboxToolSelectContext) => void | Promise<void>;
  items?: SandboxToolItemOptions[];
}

export interface SandboxToolHandle {
  update: (
    patch: Partial<Omit<SandboxToolOptions, "id" | "onSelect">>
  ) => Promise<void>;
  unregister: () => Promise<void>;
}

export interface SandboxPortalHandle extends SandboxPaneHandle {
  /** Sends a message into the portal's CasualOS instance. */
  send: (message: SandboxJsonValue) => Promise<void>;
  /** Called with each message the portal's CasualOS instance sends. */
  onMessage: (listener: (message: unknown) => void) => void;
}

export interface SandboxPaneHandle {
  paneId: string;
  close: () => Promise<void>;
  /** Called once when the pane closes, however it closed. */
  onClose: (listener: () => void) => void;
}

export interface SandboxContext {
  /**
   * The id Seed Bible knows this extension by: the folder its bundle is
   * hosted in, `#`, and the `id` from `extension.json`, like
   * `https://example.com/extensions/#verse-art`.
   */
  extensionId: string;
  permissions: {
    /** What the user has granted so far. */
    granted: ReadonlySignal<readonly SandboxPermission[]>;
    /** What `extension.json` lists under `optionalPermissions`. */
    optional: readonly SandboxPermission[];
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
     * rejects with an `invalid_request` `SandboxError`.
     */
    request: (
      permissions: SandboxPermission | SandboxPermission[]
    ) => Promise<boolean>;
  };
  i18n: {
    language: ReadonlySignal<string>;
    direction: ReadonlySignal<"ltr" | "rtl">;
    /**
     * Looks `key` up in this extension's own `extension.json` translations
     * for the current language (falling back to `en`), and fills `{{name}}`
     * placeholders from `values`.
     */
    t: (
      key: string,
      defaultValue?: string,
      values?: Record<string, string | number>
    ) => string;
  };
  app: {
    isMobile: ReadonlySignal<boolean>;
    /** Shows a toast, labelled with this extension's name. */
    toast: (message: string) => Promise<void>;
  };
  reading: {
    /** Null unless `reading:position` is granted. */
    position: ReadonlySignal<SandboxReadingPosition | null>;
    /** Empty unless `reading:selection` is granted. */
    selection: ReadonlySignal<SandboxSelectedVerse[]>;
    /** Needs `reading:navigate`. */
    open: (ref: SandboxVerseRef) => Promise<void>;
  };
  tools: {
    registerToolbarTool: (
      tool: SandboxToolOptions
    ) => Promise<SandboxToolHandle>;
    registerVerseToolbarTool: (
      tool: SandboxToolOptions
    ) => Promise<SandboxToolHandle>;
    registerQuickTool: (tool: SandboxToolOptions) => Promise<SandboxToolHandle>;
    registerBelowReaderTool: (
      tool: SandboxToolOptions
    ) => Promise<SandboxToolHandle>;
  };
  panes: {
    open: (options: SandboxPaneOptions) => Promise<SandboxPaneHandle>;
    close: (paneId: string) => Promise<void>;
  };
  /**
   * A small key/value store of this extension's own, kept by the host. A
   * sandboxed frame has no `localStorage` of its own.
   */
  storage: {
    get: <T extends SandboxJsonValue = SandboxJsonValue>(
      key: string
    ) => Promise<T | null>;
    set: (key: string, value: SandboxJsonValue) => Promise<void>;
    remove: (key: string) => Promise<void>;
    keys: () => Promise<string[]>;
  };
  /** This extension's own (non-sensitive) settings from `extension.json`. */
  settings: {
    get: (key: string) => Promise<string | number | boolean | null>;
    /**
     * Shows one of your `views` as this extension's settings, on its
     * Settings tab in Settings → Extensions. Main code only.
     */
    registerPanel: (view: string) => Promise<void>;
  };
  /**
   * An id for the signed-in user that's the same every time for this
   * extension but different for every extension, and isn't their real id.
   * Null when signed out. Needs no permission.
   */
  identity: ReadonlySignal<string | null>;
  /** Public Bible text. Needs no permission. */
  bible: {
    chapter: (ref: {
      translationId: string;
      bookId: string;
      chapter: number;
    }) => Promise<{ verses: { number: number; text: string }[] }>;
  };
  /** Reading needs `highlights:read`; adding and removing, `highlights:write`. */
  highlights: {
    /** The highlight color ids the current theme has. */
    colors: () => Promise<string[]>;
    list: (ref: ChapterRef) => Promise<SandboxHighlight[]>;
    add: (
      ref: ChapterRef & { verses: number[]; colorId: string }
    ) => Promise<void>;
    remove: (ref: ChapterRef & { verses: number[] }) => Promise<void>;
  };
  /**
   * Reading needs `notes:read`; writing, `notes:write`. Notes are plain text
   * here. An extension can only change or delete the notes it added.
   * Writing needs the user to be signed in (`unavailable` otherwise).
   */
  notes: {
    list: (ref: { bookId: string; chapter: number }) => Promise<SandboxNote[]>;
    create: (note: {
      bookId: string;
      chapter: number;
      verses?: number[];
      text: string;
    }) => Promise<{ id: string }>;
    update: (note: {
      id: string;
      bookId: string;
      chapter: number;
      text: string;
    }) => Promise<void>;
    delete: (note: {
      id: string;
      bookId: string;
      chapter: number;
    }) => Promise<void>;
  };
  /** Reading needs `saves:read`; writing, `saves:write` and a signed-in user. */
  saves: {
    list: () => Promise<SandboxSave[]>;
    add: (
      save: ChapterRef & {
        verse?: number | [number, number];
        categories?: string[];
      }
    ) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };
  /** Needs `reading:history`. Times in ms since the epoch, at most a year apart. */
  history: {
    list: (range: {
      from: number;
      to: number;
    }) => Promise<SandboxReadingEvent[]>;
  };
  /** Needs `profile:read`. Null when signed out. */
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
   */
  audio: {
    /** An audio file from one of the manifest's `network` hosts (`https:`). */
    play: (url: string) => Promise<{ finished: boolean }>;
    /**
     * The app's recorded narration of a chapter, by `reader` (see
     * `narrators`), or the first there is. Rejects with `not_found` when
     * the chapter has none.
     */
    playNarration: (
      ref: ChapterRef & { reader?: string }
    ) => Promise<{ finished: boolean }>;
    /** Who has recorded narration for a chapter; empty when no one has. */
    narrators: (ref: ChapterRef) => Promise<string[]>;
    /** Reads a chapter, or some of its verses, with the app's text-to-speech. */
    readAloud: (
      ref: ChapterRef & { fromVerse?: number; toVerse?: number }
    ) => Promise<{ finished: boolean }>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    /** Seconds, or for `readAloud`, a verse index. */
    seek: (position: number) => Promise<void>;
    stop: () => Promise<void>;
    /** What this extension is playing; null when nothing is. */
    playback: ReadonlySignal<SandboxPlayback | null>;
  };
  /** Needs `clipboard:write`. Only right after the user interacts with this extension. */
  clipboard: { writeText: (text: string) => Promise<void> };
  /**
   * CasualOS grid and map portals (`ao.bot` patterns), each in a pane the
   * host draws. Needs `embed:casualos`.
   */
  portals: {
    open: (options: SandboxPortalOptions) => Promise<SandboxPortalHandle>;
  };
  /**
   * The microphone and camera, through a dialog the host shows: the user
   * sees which extension is asking, presses the button themselves, and the
   * extension gets only the result. Only right after the user interacts
   * with this extension. Each resolves null if the user cancels.
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
    registerProvider: (provider: {
      id: string;
      title: string;
      description: string;
      discover: (
        request: SandboxDiscoverRequest
      ) => SandboxDiscoverResult[] | Promise<SandboxDiscoverResult[]>;
      /** Called with a `content` result's `id` when the user picks it. */
      onSelect?: (resultId: string) => void;
    }) => Promise<{ unregister: () => Promise<void> }>;
  };
  /**
   * A chat participant. Needs `chat:respond`; `shared: true` also needs
   * `chat:shared`. Main code only.
   */
  chats: {
    registerProvider: (provider: {
      id: string;
      name: string;
      shared?: boolean;
      /** Returns the reply, or null to stay quiet. */
      respond: (
        request: SandboxChatRequest
      ) => string | null | Promise<string | null>;
    }) => Promise<{ unregister: () => Promise<void> }>;
  };
  /**
   * Dialogs, titled with the extension's name. Only right after the user
   * interacts with this extension, one at a time. Each resolves when it's
   * closed.
   */
  modals: {
    alert: (dialog: { title: string; message: string }) => Promise<void>;
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
    fetch: (request: {
      url: string;
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
      body?: unknown;
      proxy?: string;
    }) => Promise<{
      status: number;
      ok: boolean;
      contentType: string | null;
      body: string;
    }>;
  };
}

interface ChapterRef {
  translationId: string;
  bookId: string;
  chapter: number;
}

export interface SandboxViewProps {
  sb: SandboxContext;
  /** Whatever was passed as `props` when it was opened. */
  props: SandboxJsonValue;
  /** Where the view is shown. */
  surface: "pane" | "modal" | "settings";
  /** The pane this view is rendered in (an id for a modal or panel). */
  paneId: string;
}

export interface SandboxExtensionDefinition {
  /**
   * Runs once in the extension's hidden background frame when it's
   * installed: register tools here.
   */
  main?: (sb: SandboxContext) => void | Promise<void>;
  /** The UI for each pane the extension opens, by name. */
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
