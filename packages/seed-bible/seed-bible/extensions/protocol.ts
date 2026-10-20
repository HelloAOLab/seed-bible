/**
 * The messages a sandboxed extension's frames and the host page exchange over
 * their `MessagePort`. Shared by the frame-side SDK (`./index.tsx`) and the
 * host's broker (`managers/ExtensionSandboxManager.tsx`), so it must stay
 * free of imports: it is bundled into every third-party extension.
 *
 * Every value here crosses a structured-clone boundary, so only plain data
 * (no functions, no class instances).
 */

export const SANDBOX_PROTOCOL_VERSION = 1;

/**
 * The permissions a sandboxed extension can declare in `extension.json`.
 * An install fails if the manifest names anything else, so an extension
 * written for a later version can't be installed into a host that wouldn't
 * enforce what it asks for.
 */
export const SANDBOX_PERMISSIONS = [
  "reading:position",
  "reading:selection",
  "reading:navigate",
  "reading:history",
  "highlights:read",
  "highlights:write",
  "notes:read",
  "notes:write",
  "saves:read",
  "saves:write",
  "profile:read",
  "chat:respond",
  "chat:shared",
  "friends:read",
  "session:read",
  "audio:playback",
  "clipboard:write",
  "embed:casualos",
  "device:microphone",
  "device:camera",
] as const;

export type SandboxPermission = (typeof SANDBOX_PERMISSIONS)[number];

export function isSandboxPermission(
  value: unknown
): value is SandboxPermission {
  return (
    typeof value === "string" &&
    (SANDBOX_PERMISSIONS as readonly string[]).includes(value)
  );
}

export interface SandboxPermissionInfo {
  /** How much harm misuse could do; the consent dialog warns about `high`. */
  risk: "low" | "medium" | "high";
  /**
   * Whether a manifest may list it under `permissions`, making the user
   * grant it to install the extension at all. High-risk permissions can't
   * be: they're only ever `optionalPermissions`, asked for when the feature
   * that needs one is used, so the user can say yes to the extension and no
   * to that one thing.
   */
  requirable: boolean;
  /** Granting this also grants these (writing something includes reading it). */
  implies?: readonly SandboxPermission[];
}

/**
 * The policy for each permission. Reading what the extension is working
 * with — the passage, the selection, and the user's own reading history,
 * highlights and saves — can be required, and so can the low-risk actions
 * the user starts themselves (reading aloud, copying, showing a CasualOS
 * view). Anything that changes the user's data, identifies them, reads
 * their private writing, involves other people, or uses their microphone or
 * camera is always optional.
 */
export const SANDBOX_PERMISSION_INFO: Record<
  SandboxPermission,
  SandboxPermissionInfo
> = {
  "reading:position": { risk: "low", requirable: true },
  "reading:selection": { risk: "low", requirable: true },
  "reading:navigate": { risk: "low", requirable: true },
  "reading:history": { risk: "medium", requirable: true },
  "highlights:read": { risk: "medium", requirable: true },
  "highlights:write": {
    risk: "high",
    requirable: false,
    implies: ["highlights:read"],
  },
  "notes:read": { risk: "high", requirable: false },
  "notes:write": { risk: "high", requirable: false, implies: ["notes:read"] },
  "saves:read": { risk: "medium", requirable: true },
  "saves:write": { risk: "high", requirable: false, implies: ["saves:read"] },
  "profile:read": { risk: "high", requirable: false },
  // It only ever sees the chats the user adds it to, which is a choice made
  // in the moment, so a chat extension may require it.
  "chat:respond": { risk: "medium", requirable: true },
  "chat:shared": {
    risk: "high",
    requirable: false,
    implies: ["chat:respond"],
  },
  "friends:read": { risk: "high", requirable: false },
  "session:read": { risk: "high", requirable: false },
  "audio:playback": { risk: "low", requirable: true },
  "clipboard:write": { risk: "low", requirable: true },
  "embed:casualos": { risk: "low", requirable: true },
  "device:microphone": { risk: "high", requirable: false },
  "device:camera": { risk: "high", requirable: false },
};

/** `granted` plus everything it implies. */
export function expandSandboxPermissions(
  granted: readonly SandboxPermission[]
): SandboxPermission[] {
  const all = new Set<SandboxPermission>(granted);
  for (const permission of granted) {
    for (const implied of SANDBOX_PERMISSION_INFO[permission].implies ?? []) {
      all.add(implied);
    }
  }
  return [...all];
}

export type SandboxTitle = string | { key: string; defaultValue: string };

/**
 * An SVG document (rendered by the host inside an `<img>`, where it can't run
 * scripts or load anything), or the name of a Material Symbols glyph.
 */
export type SandboxIcon = { svg: string } | { material: string };

export type SandboxToolSurface = "toolbar" | "verse" | "quick" | "belowReader";

export interface SandboxToolItem {
  id: string;
  title: SandboxTitle;
  icon?: SandboxIcon;
  disabled?: boolean;
}

export interface SandboxToolDefinition {
  id: string;
  surface: SandboxToolSurface;
  title: SandboxTitle;
  icon: SandboxIcon;
  priority?: number;
  visible?: boolean;
  disabled?: boolean;
  /** A submenu. When set, selecting the tool itself does nothing. */
  items?: SandboxToolItem[];
}

export type SandboxToolPatch = Partial<
  Omit<SandboxToolDefinition, "id" | "surface">
>;

export interface SandboxReadingPosition {
  translationId: string | null;
  bookId: string | null;
  chapterNumber: number | null;
}

export interface SandboxSelectedVerse {
  translationId: string | null;
  bookId: string;
  chapterNumber: number;
  verse: number;
}

export type SandboxPanePlacement = "side" | "floating" | "fullscreen";

export type SandboxJsonValue =
  | string
  | number
  | boolean
  | null
  | SandboxJsonValue[]
  | { [key: string]: SandboxJsonValue };

export interface SandboxPaneOptions {
  /** The name of an entry in the extension's `views`. */
  view: string;
  placement: SandboxPanePlacement;
  title: SandboxTitle;
  /** Handed to the view as `props`. */
  props?: SandboxJsonValue;
  /**
   * Reuses this extension's pane with the same id instead of opening another.
   * Scoped to the extension, so it can never address another pane.
   */
  id?: string;
  width?: number;
  height?: number;
}

export interface SandboxVerseRef {
  bookId: string;
  chapter: number;
  verse?: number;
}

/** App state the host keeps every frame up to date with. */
export interface SandboxState {
  /** `--sb-*` CSS declarations for the active theme. */
  themeCss: string;
  language: string;
  direction: "ltr" | "rtl";
  /** This extension's own translation strings for `language`, over `en`. */
  strings: Record<string, string>;
  isMobile: boolean;
  /** Null unless `reading:position` is granted. */
  position: SandboxReadingPosition | null;
  /** Empty unless `reading:selection` is granted. */
  selection: SandboxSelectedVerse[];
  /**
   * An id for the signed-in user that's the same every time for this
   * extension, but different for every extension and not the user's real
   * id, so an extension can keep per-user data without learning who the
   * user is. Null when signed out.
   */
  identity: string | null;
  /** Font stylesheets to load, so text matches the app. */
  fontStylesheets: string[];
  /**
   * The shared reading session open in the current tab. Null when there
   * isn't one, and always null unless `session:read` is granted.
   */
  session: SandboxSharedSession | null;
  /**
   * What this extension is playing through the app's player. Null when
   * nothing is, and always null without `audio:playback`.
   */
  playback: SandboxPlayback | null;
}

export interface SandboxPlayback {
  /** An audio file, the app's recorded narration, or text-to-speech. */
  kind: "file" | "narration" | "speech";
  /** Seconds, or for speech, verses (the index of the one being read). */
  unit: "seconds" | "verses";
  /** False while paused. */
  isPlaying: boolean;
  position: number;
  /** Null until the audio has reported its length. */
  duration: number | null;
}

export interface SandboxSessionParticipant {
  /**
   * Stable for this person and this extension, like `SandboxState.identity`:
   * a signed-in participant's id here is the same as the `identity` this
   * extension sees on their device.
   */
  id: string;
  /** Null when they haven't set a name, or aren't signed in. */
  name: string | null;
  isHost: boolean;
  /** Connected right now. */
  isActive: boolean;
  /** The user this extension is running for. */
  isYou: boolean;
}

export interface SandboxSharedSession {
  participants: SandboxSessionParticipant[];
}

export interface SandboxFriend {
  /** Pseudonymous, like `SandboxSessionParticipant.id`. */
  id: string;
  name: string | null;
  pictureUrl: string | null;
}

/** A recording or photo, as bytes plus its media type. */
export interface SandboxCapture {
  type: string;
  bytes: ArrayBuffer;
}

export type SandboxCasualOSPattern = { name: string } | { aux: string };

export interface SandboxPortalOptions {
  /** The pattern to load. Without one, the portal opens empty. */
  pattern?: SandboxCasualOSPattern;
  portalType: "grid" | "map";
  /** The portal's name. Defaults to `"home"`. */
  portal?: string;
  /** The CasualOS instance. Defaults to a fresh one for each open. */
  inst?: string;
  /** Extra query parameters for the pattern. */
  query?: Record<string, string>;
  placement: SandboxPanePlacement;
  title: SandboxTitle;
  /** Reuses this extension's pane with the same id, as for `panes.open`. */
  id?: string;
  width?: number;
  height?: number;
}

export type SandboxFrameMode =
  | { kind: "background" }
  | {
      kind: "view";
      view: string;
      /** Where the view is shown. */
      surface: "pane" | "modal" | "settings";
      /** The pane's id for `surface: "pane"`; an id for the modal or panel otherwise. */
      paneId: string;
      props: SandboxJsonValue;
    };

/** A highlight on one verse or an inclusive `[start, end]` range. */
export interface SandboxHighlight {
  verse: number | [number, number];
  colorId: string;
}

export interface SandboxNote {
  id: string;
  /** The verses it's attached to; null for the whole chapter. */
  verses: number[] | null;
  /** The note as plain text. */
  text: string;
  createdAt: number | null;
  updatedAt: number | null;
  /** Only notes the extension added can be changed or deleted by it. */
  addedByThisExtension: boolean;
}

export interface SandboxSave {
  id: string;
  translationId: string;
  bookId: string;
  chapter: number;
  verse: number | [number, number] | null;
  categories: string[];
  createdAt: number;
}

/** One sitting with a chapter; times in milliseconds since the epoch. */
export interface SandboxReadingEvent {
  bookId: string;
  chapter: number;
  start: number;
  end: number;
}

export interface SandboxProfile {
  /** The user's real account id. */
  userId: string;
  name: string;
  pictureUrl: string | null;
}

export interface SandboxReference {
  bookId: string;
  chapter: number;
  verse?: number;
  endChapter?: number;
  endVerse?: number;
}

/** What a Discover provider can show, as data the host renders. */
export type SandboxDiscoverResult =
  | {
      type: "content";
      /** Passed back to `onSelect` when the user picks it. */
      id: string;
      title: string;
      description: string;
      reference: SandboxReference;
      verses?: number[];
      author?: string;
      /** An `https:` image on one of the manifest's `network` hosts. */
      image?: string;
    }
  | {
      type: "cross-reference";
      reference: SandboxReference;
      crossReference: SandboxReference;
    }
  | { type: "study-note"; reference: SandboxReference; text: string };

export interface SandboxDiscoverRequest {
  providerId: string;
  translationId: string;
  bookId: string;
  chapter: number;
  language: string;
}

export interface SandboxChatMessage {
  /** The author's display name, if they have one. */
  author: string | null;
  /** True for messages this extension's provider sent. */
  fromThisProvider: boolean;
  text: string;
  timeMs: number;
}

export interface SandboxChatRequest {
  providerId: string;
  chatId: string;
  /** Whether other people are in the chat (needs `chat:shared`). */
  shared: boolean;
  messages: SandboxChatMessage[];
}

/** What the host asks an extension's background frame for, by kind. */
export interface SandboxHostRequests {
  discover: {
    payload: SandboxDiscoverRequest;
    result: SandboxDiscoverResult[];
  };
  chat: { payload: SandboxChatRequest; result: string | null };
}

export type SandboxHostRequestKind = keyof SandboxHostRequests;

/** Sent with the port that connects a frame to the host. */
export interface SandboxInit {
  protocol: number;
  extensionId: string;
  mode: SandboxFrameMode;
  granted: SandboxPermission[];
  /** What the manifest lets the extension ask for later. */
  optional: SandboxPermission[];
  state: SandboxState;
}

/** Each frame → host call, by method: what it takes and what it returns. */
export interface SandboxMethods {
  "tools.register": { params: SandboxToolDefinition; result: null };
  "tools.update": {
    params: { id: string; patch: SandboxToolPatch };
    result: null;
  };
  "tools.unregister": { params: { id: string }; result: null };
  "panes.open": { params: SandboxPaneOptions; result: { paneId: string } };
  "panes.close": { params: { paneId: string }; result: null };
  "app.toast": { params: { message: string }; result: null };
  "reading.open": { params: SandboxVerseRef; result: null };
  "storage.get": {
    params: { key: string };
    result: SandboxJsonValue | null;
  };
  "storage.set": {
    params: { key: string; value: SandboxJsonValue };
    result: null;
  };
  "storage.remove": { params: { key: string }; result: null };
  "storage.keys": { params: Record<string, never>; result: string[] };
  "settings.get": {
    params: { key: string };
    result: string | number | boolean | null;
  };
  "highlights.colors": { params: Record<string, never>; result: string[] };
  "highlights.list": {
    params: { translationId: string; bookId: string; chapter: number };
    result: SandboxHighlight[];
  };
  "highlights.add": {
    params: {
      translationId: string;
      bookId: string;
      chapter: number;
      verses: number[];
      colorId: string;
    };
    result: null;
  };
  "highlights.remove": {
    params: {
      translationId: string;
      bookId: string;
      chapter: number;
      verses: number[];
    };
    result: null;
  };
  "notes.list": {
    params: { bookId: string; chapter: number };
    result: SandboxNote[];
  };
  "notes.create": {
    params: {
      bookId: string;
      chapter: number;
      verses?: number[];
      text: string;
    };
    result: { id: string };
  };
  "notes.update": {
    params: { id: string; bookId: string; chapter: number; text: string };
    result: null;
  };
  "notes.delete": {
    params: { id: string; bookId: string; chapter: number };
    result: null;
  };
  "saves.list": { params: Record<string, never>; result: SandboxSave[] };
  "saves.add": {
    params: {
      translationId: string;
      bookId: string;
      chapter: number;
      verse?: number | [number, number];
      categories?: string[];
    };
    result: null;
  };
  "saves.remove": { params: { id: string }; result: null };
  "history.list": {
    params: { from: number; to: number };
    result: SandboxReadingEvent[];
  };
  "profile.get": {
    params: Record<string, never>;
    result: SandboxProfile | null;
  };
  "bible.chapter": {
    params: { translationId: string; bookId: string; chapter: number };
    result: { verses: { number: number; text: string }[] };
  };
  "discover.register": {
    params: { id: string; title: string; description: string };
    result: null;
  };
  "discover.unregister": { params: { id: string }; result: null };
  "chats.register": {
    params: { id: string; name: string; shared?: boolean };
    result: null;
  };
  "chats.unregister": { params: { id: string }; result: null };
  /** The background frame's answer to a host request. */
  respond: {
    params: { requestId: number; value?: unknown; error?: string };
    result: null;
  };
  /** Resolves once the modal is closed. */
  "modals.open": {
    params: {
      title: string;
      message?: string;
      view?: string;
      props?: SandboxJsonValue;
    };
    result: null;
  };
  "settings.registerPanel": { params: { view: string }; result: null };
  "sensitive.fetch": {
    params: {
      url: string;
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
      body?: unknown;
      proxy?: string;
    };
    result: {
      status: number;
      ok: boolean;
      contentType: string | null;
      body: string;
    };
  };
  "friends.list": { params: Record<string, never>; result: SandboxFriend[] };
  /**
   * Each of these plays through the app's player, and resolves once it ends:
   * `finished` is false if it was stopped rather than played to the end.
   */
  "audio.play": { params: { url: string }; result: { finished: boolean } };
  "audio.playNarration": {
    params: {
      translationId: string;
      bookId: string;
      chapter: number;
      reader?: string;
    };
    result: { finished: boolean };
  };
  "audio.readAloud": {
    params: {
      translationId: string;
      bookId: string;
      chapter: number;
      fromVerse?: number;
      toVerse?: number;
    };
    result: { finished: boolean };
  };
  "audio.narrators": {
    params: { translationId: string; bookId: string; chapter: number };
    result: string[];
  };
  "audio.pause": { params: Record<string, never>; result: null };
  "audio.resume": { params: Record<string, never>; result: null };
  "audio.seek": { params: { position: number }; result: null };
  "audio.stop": { params: Record<string, never>; result: null };
  "clipboard.writeText": { params: { text: string }; result: null };
  "portals.open": {
    params: SandboxPortalOptions;
    result: { paneId: string };
  };
  "portals.send": {
    params: { paneId: string; message: SandboxJsonValue };
    result: null;
  };
  /** Null if the user cancelled. */
  "devices.recordAudio": {
    params: { maxSeconds?: number };
    result: SandboxCapture | null;
  };
  /** Null if the user cancelled. */
  "devices.takePhoto": {
    params: Record<string, never>;
    result: SandboxCapture | null;
  };
  /** The background frame's answer to a heartbeat. */
  pong: { params: Record<string, never>; result: null };
  /**
   * Asks the user for optional permissions. `granted` is true only if all of
   * them are granted afterwards.
   */
  "permissions.request": {
    params: { permissions: SandboxPermission[] };
    result: { granted: boolean };
  };
  /** Sent once by the background frame when `main` has finished (or failed). */
  ready: { params: { error?: string }; result: null };
}

export type SandboxMethod = keyof SandboxMethods;

/**
 * The permission each call needs; calls not listed need none. Granted
 * permissions count with what they imply (`expandSandboxPermissions`). The
 * host checks this before anything else, and the SDK's test host and the
 * build tooling's checks read it too.
 */
export const SANDBOX_METHOD_PERMISSIONS: Partial<
  Record<SandboxMethod, SandboxPermission>
> = {
  "reading.open": "reading:navigate",
  "highlights.list": "highlights:read",
  "highlights.add": "highlights:write",
  "highlights.remove": "highlights:write",
  "notes.list": "notes:read",
  "notes.create": "notes:write",
  "notes.update": "notes:write",
  "notes.delete": "notes:write",
  "saves.list": "saves:read",
  "saves.add": "saves:write",
  "saves.remove": "saves:write",
  "history.list": "reading:history",
  "profile.get": "profile:read",
  // A provider is told which chapter is open every time it's asked.
  "discover.register": "reading:position",
  "chats.register": "chat:respond",
  "friends.list": "friends:read",
  "audio.readAloud": "audio:playback",
  "audio.play": "audio:playback",
  "audio.playNarration": "audio:playback",
  "audio.narrators": "audio:playback",
  "audio.pause": "audio:playback",
  "audio.resume": "audio:playback",
  "audio.seek": "audio:playback",
  "audio.stop": "audio:playback",
  "clipboard.writeText": "clipboard:write",
  "devices.recordAudio": "device:microphone",
  "devices.takePhoto": "device:camera",
  "portals.open": "embed:casualos",
  "portals.send": "embed:casualos",
};

export interface SandboxRequest<M extends SandboxMethod = SandboxMethod> {
  type: "call";
  id: number;
  method: M;
  params: SandboxMethods[M]["params"];
}

export type SandboxErrorCode =
  | "permission_denied"
  | "invalid_request"
  | "not_found"
  | "limit_exceeded"
  /** Not possible right now, e.g. signed out, or the service failed. */
  | "unavailable"
  | "internal";

export type SandboxResponse =
  | { type: "result"; id: number; ok: true; value: unknown }
  | {
      type: "result";
      id: number;
      ok: false;
      error: { code: SandboxErrorCode; message: string };
    };

export type SandboxHostEvent =
  | {
      type: "event";
      name: "tool.select";
      toolId: string;
      itemId: string | null;
      /** Empty unless `reading:selection` is granted. */
      selection: SandboxSelectedVerse[];
    }
  | { type: "event"; name: "pane.closed"; paneId: string }
  /** A message from one of this extension's CasualOS portals. */
  | {
      type: "event";
      name: "portal.message";
      paneId: string;
      message: unknown;
    }
  | {
      type: "event";
      name: "request";
      requestId: number;
      kind: SandboxHostRequestKind;
      payload: SandboxHostRequests[SandboxHostRequestKind]["payload"];
    }
  | {
      type: "event";
      name: "discover.select";
      providerId: string;
      resultId: string;
    }
  /** Checks the background frame is still answering; it replies with `pong`. */
  | { type: "ping" }
  | { type: "state"; state: Partial<SandboxState> }
  /** The permissions granted now, after the user granted an optional one. */
  | { type: "permissions"; granted: SandboxPermission[] };

export type SandboxHostMessage = SandboxResponse | SandboxHostEvent;

/**
 * The name of the function on an extension module's default export that the
 * frame's bootstrap script calls. `defineExtension` adds it, so its value is
 * always the SDK's own `start`, matching the SDK version the extension was
 * built with.
 */
export const SANDBOX_START_KEY = "__seedBibleSandboxStart";
