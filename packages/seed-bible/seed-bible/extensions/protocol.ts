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

/**
 * A permission an extension declares in `extension.json`, under
 * `permissions` (granted at install) or `optionalPermissions` (asked for
 * later with `sb.permissions.request`). See `SANDBOX_PERMISSION_INFO` for
 * which can be required, and `SANDBOX_METHOD_PERMISSIONS` for what each
 * unlocks.
 */
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

/**
 * Text the app shows for the extension, up to 120 characters: a plain
 * string, or a key in the extension's `extension.json` translations, so it
 * follows the user's language, with the text to show if it's missing.
 */
export type SandboxTitle = string | { key: string; defaultValue: string };

/**
 * An SVG document (rendered by the host inside an `<img>`, where it can't run
 * scripts or load anything), or the name of a Material Symbols glyph.
 */
export type SandboxIcon =
  | {
      /** A whole `<svg>` element, at most 16 KB. */
      svg: string;
    }
  | {
      /** A Material Symbols name, like `"palette"` (lowercase and `_`). */
      material: string;
    };

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

/**
 * The passage in the reader in view. Note `chapterNumber` here, where the
 * methods that take a chapter call it `chapter`.
 */
export interface SandboxReadingPosition {
  /** Like `"BSB"`; null before a translation is open. */
  translationId: string | null;
  /** A three-letter USFM book code, like `"JHN"`; null before a book is open. */
  bookId: string | null;
  chapterNumber: number | null;
}

/** One verse the user has selected in the reader. */
export interface SandboxSelectedVerse {
  translationId: string | null;
  /** A three-letter USFM book code, like `"JHN"`. */
  bookId: string;
  chapterNumber: number;
  verse: number;
}

/**
 * Where a pane opens: docked beside the reader, as a window over it, or
 * covering the whole app.
 */
export type SandboxPanePlacement = "side" | "floating" | "fullscreen";

/**
 * Anything `JSON.stringify` round-trips: no functions, `Date`s, `Map`s or
 * class instances. This is what crosses between the extension and the app.
 */
export type SandboxJsonValue =
  | string
  | number
  | boolean
  | null
  | SandboxJsonValue[]
  | { [key: string]: SandboxJsonValue };

/** What `sb.panes.open` takes. */
export interface SandboxPaneOptions {
  /** The name of an entry in the extension's `views`. */
  view: string;
  placement: SandboxPanePlacement;
  title: SandboxTitle;
  /** Handed to the view as `props`. At most 64 KB as JSON. */
  props?: SandboxJsonValue;
  /**
   * Reuses this extension's pane with the same id instead of opening another.
   * Scoped to the extension, so it can never address another pane.
   */
  id?: string;
  /** In pixels, 120–4000. Defaults to 480 when only `height` is given. */
  width?: number;
  /** In pixels, 80–4000. Defaults to 320 when only `width` is given. */
  height?: number;
}

/** Where `sb.reading.open` takes the reader. */
export interface SandboxVerseRef {
  /** A three-letter USFM book code, like `"JHN"`. */
  bookId: string;
  chapter: number;
  /** Scrolls to this verse. */
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

/** The shared reading session open in the current tab (`sb.session.current`). */
export interface SandboxSharedSession {
  /** Everyone in it, the user included; at most 100. */
  participants: SandboxSessionParticipant[];
}

/** One of the user's friends (`sb.friends.list`). */
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

/** A CasualOS pattern: published, by name, or an `.aux` file by `https:` URL. */
export type SandboxCasualOSPattern = { name: string } | { aux: string };

/** What `sb.portals.open` takes. */
export interface SandboxPortalOptions {
  /** The pattern to load. Without one, the portal opens empty. */
  pattern?: SandboxCasualOSPattern;
  portalType: "grid" | "map";
  /** The portal's name. Defaults to `"home"`. */
  portal?: string;
  /** The CasualOS instance. Defaults to a fresh one for each open. */
  inst?: string;
  /**
   * Up to 20 extra query parameters for the pattern. Can't set `inst`,
   * `staticInst`, `gridPortal`, `mapPortal`, `pattern` or `patternAux`.
   */
  query?: Record<string, string>;
  placement: SandboxPanePlacement;
  title: SandboxTitle;
  /** Reuses this extension's pane with the same id, as for `panes.open`. */
  id?: string;
  /** In pixels, as for `panes.open`. */
  width?: number;
  /** In pixels, as for `panes.open`. */
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
  /** One of `sb.highlights.colors()`. */
  colorId: string;
}

/** A note on a chapter (`sb.notes.list`). */
export interface SandboxNote {
  id: string;
  /** The verses it's attached to; null for the whole chapter. */
  verses: number[] | null;
  /** The note as plain text. */
  text: string;
  /** Milliseconds since the epoch; null if unknown. */
  createdAt: number | null;
  /** Milliseconds since the epoch; null if unknown. */
  updatedAt: number | null;
  /** Only notes the extension added can be changed or deleted by it. */
  addedByThisExtension: boolean;
}

/** A saved chapter, verse or range: a bookmark (`sb.saves.list`). */
export interface SandboxSave {
  /** For `sb.saves.remove`. */
  id: string;
  translationId: string;
  bookId: string;
  chapter: number;
  /** A verse, an inclusive `[start, end]` range, or null for the whole chapter. */
  verse: number | [number, number] | null;
  categories: string[];
  /** Milliseconds since the epoch. */
  createdAt: number;
}

/** One sitting with a chapter; times in milliseconds since the epoch. */
export interface SandboxReadingEvent {
  bookId: string;
  chapter: number;
  start: number;
  end: number;
}

/** The signed-in user (`sb.profile.get`). */
export interface SandboxProfile {
  /** The user's real account id. */
  userId: string;
  /** Their display name. */
  name: string;
  pictureUrl: string | null;
}

/**
 * A passage for the Discover panel: a chapter, a verse, or a range up to
 * `endChapter`/`endVerse`.
 */
export interface SandboxReference {
  /** A three-letter USFM book code, like `"JHN"`. */
  bookId: string;
  chapter: number;
  verse?: number;
  endChapter?: number;
  endVerse?: number;
}

/** A Bible translation (`sb.bible.translations`). */
export interface SandboxTranslation {
  /** Like `"BSB"`: what the other `sb.bible` calls take as `translationId`. */
  id: string;
  /** Its name in its own language. */
  name: string;
  englishName: string;
  shortName: string;
  /** An ISO 639-3 code, like `"eng"`. */
  language: string;
  /** The language's name in that language; null if unknown. */
  languageName: string | null;
  languageEnglishName: string | null;
  textDirection: "ltr" | "rtl";
  website: string;
  licenseUrl: string;
  /** A notice the license asks to be shown with the text; null if none. */
  licenseNotice: string | null;
  numberOfBooks: number;
  totalNumberOfChapters: number;
  totalNumberOfVerses: number;
  /** On the user's device, so it can be read with no connection. */
  downloaded: boolean;
}

/** A book of a translation (`sb.bible.books`). */
export interface SandboxBook {
  /** A three-letter USFM book code, like `"JHN"`. */
  id: string;
  /** The name the translation gives it. */
  name: string;
  /** The name it's commonly known by, in the translation's language. */
  commonName: string;
  /** A longer title, if the translation gives one. */
  title: string | null;
  /** Its position in the translation, from 1. */
  order: number;
  numberOfChapters: number;
  firstChapterNumber: number;
  lastChapterNumber: number;
  totalNumberOfVerses: number;
  /** Part of the Apocrypha / Deuterocanon. */
  isApocryphal: boolean;
}

/** A chapter of some book, as in a chapter's `next` and `previous`. */
export interface SandboxChapterRef {
  bookId: string;
  chapter: number;
}

/** One piece of a chapter, in reading order (`SandboxChapter.content`). */
export type SandboxChapterContent =
  | { type: "heading"; text: string }
  /** A paragraph or stanza break. */
  | { type: "lineBreak" }
  /** A psalm's superscription, like "A Psalm of David." */
  | { type: "hebrewSubtitle"; text: string }
  | {
      type: "verse";
      number: number;
      text: string;
      /** The `id`s of this verse's footnotes, in `SandboxChapter.footnotes`. */
      footnotes: number[];
    };

export interface SandboxFootnote {
  id: number;
  text: string;
  /** The mark to show in the text, like `"a"`; null for none, `"+"` for any. */
  caller: string | null;
  /** The verse it's on; null when the translation doesn't say. */
  verse: number | null;
}

/** A chapter of Bible text (`sb.bible.chapter`). */
export interface SandboxChapter {
  translationId: string;
  bookId: string;
  chapter: number;
  /** Each verse as plain text, without headings. */
  verses: { number: number; text: string }[];
  /** Headings, breaks and verses, for laying the chapter out. */
  content: SandboxChapterContent[];
  footnotes: SandboxFootnote[];
  /** The chapter after this one, possibly in the next book; null at the end. */
  next: SandboxChapterRef | null;
  /** The chapter before this one; null at the start. */
  previous: SandboxChapterRef | null;
}

/** A commentary on the Bible (`sb.bible.commentaries`). */
export interface SandboxCommentary {
  /** Like `"adam-clarke"`: what the commentary calls take as `commentaryId`. */
  id: string;
  name: string;
  englishName: string;
  language: string;
  languageName: string | null;
  languageEnglishName: string | null;
  textDirection: "ltr" | "rtl";
  website: string;
  licenseUrl: string;
  numberOfBooks: number;
  totalNumberOfChapters: number;
  totalNumberOfVerses: number;
}

/** A book a commentary covers (`sb.bible.commentaryBooks`). */
export interface SandboxCommentaryBook {
  id: string;
  name: string;
  commonName: string;
  order: number;
  /** The commentary's introduction to the book, if it has one. */
  introduction: string | null;
  numberOfChapters: number;
  /** Null when the commentary covers only the book's introduction. */
  firstChapterNumber: number | null;
  lastChapterNumber: number | null;
  totalNumberOfVerses: number;
}

/** A commentary's notes on one chapter (`sb.bible.commentaryChapter`). */
export interface SandboxCommentaryChapter {
  commentaryId: string;
  bookId: string;
  chapter: number;
  /** The commentary's introduction to the chapter, if it has one. */
  introduction: string | null;
  /** The note on each verse it comments on, as plain text. */
  verses: { number: number; text: string }[];
  next: SandboxChapterRef | null;
  previous: SandboxChapterRef | null;
}

/** An article in a commentary about a person, place or topic. */
export interface SandboxCommentaryProfile {
  id: string;
  subject: string;
  /** The passage it's about; null if it isn't about one. */
  reference: SandboxReference | null;
}

/** A dataset of verse-level data, such as cross-references (`sb.bible.datasets`). */
export interface SandboxDataset {
  /** Like `"open-cross-ref"`: what the dataset calls take as `datasetId`. */
  id: string;
  name: string;
  englishName: string;
  language: string;
  languageName: string | null;
  languageEnglishName: string | null;
  textDirection: "ltr" | "rtl";
  website: string;
  licenseUrl: string;
  numberOfBooks: number;
  totalNumberOfChapters: number;
  totalNumberOfVerses: number;
  totalNumberOfReferences: number;
}

/** A book a dataset covers (`sb.bible.datasetBooks`). */
export interface SandboxDatasetBook {
  id: string;
  order: number;
  numberOfChapters: number;
  firstChapterNumber: number;
  lastChapterNumber: number | null;
  totalNumberOfVerses: number;
  totalNumberOfReferences: number;
}

/** A passage a dataset points to, with how relevant it is. */
export interface SandboxDatasetReference extends SandboxReference {
  /** Higher is more relevant; absent when the dataset doesn't score them. */
  score?: number;
}

/** A dataset's entries for one chapter (`sb.bible.datasetChapter`). */
export interface SandboxDatasetChapter {
  datasetId: string;
  bookId: string;
  chapter: number;
  /** The verses that have entries, each with the passages it points to. */
  verses: { verse: number; references: SandboxDatasetReference[] }[];
}

/** What a Discover provider can show, as data the host renders. */
export type SandboxDiscoverResult =
  | {
      type: "content";
      /** Passed back to `onSelect` when the user picks it. */
      id: string;
      /** Up to 200 characters. */
      title: string;
      /** Up to 2,000 characters. */
      description: string;
      /** The passage it's about. */
      reference: SandboxReference;
      /** The verses it's about, if not the whole reference. */
      verses?: number[];
      /** Defaults to the extension's name. */
      author?: string;
      /** An `https:` image on one of the manifest's `network` hosts. */
      image?: string;
    }
  | {
      type: "cross-reference";
      reference: SandboxReference;
      crossReference: SandboxReference;
    }
  | {
      type: "study-note";
      reference: SandboxReference;
      /** Plain text, up to 5,000 characters. */
      text: string;
    };

/** What a Discover provider's `discover` is asked about: the open chapter. */
export interface SandboxDiscoverRequest {
  /** The `id` the provider was registered with. */
  providerId: string;
  translationId: string;
  bookId: string;
  chapter: number;
  /** The app's language code, so results can match it. */
  language: string;
}

/** One message in a chat, as a chat provider sees it. */
export interface SandboxChatMessage {
  /** The author's display name, if they have one. */
  author: string | null;
  /** True for messages this extension's provider sent. */
  fromThisProvider: boolean;
  text: string;
  /** When it was sent, in milliseconds since the epoch. */
  timeMs: number;
}

/** What a chat provider's `respond` is called with. */
export interface SandboxChatRequest {
  /** The `id` the provider was registered with. */
  providerId: string;
  /** Which chat; stable for that chat. */
  chatId: string;
  /** Whether other people are in the chat (needs `chat:shared`). */
  shared: boolean;
  /** The last 100 text messages, oldest first. */
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
  "bible.translations": {
    params: Record<string, never>;
    result: SandboxTranslation[];
  };
  "bible.books": {
    params: { translationId: string };
    result: { translation: SandboxTranslation; books: SandboxBook[] };
  };
  "bible.chapter": {
    params: { translationId: string; bookId: string; chapter: number };
    result: SandboxChapter;
  };
  "bible.commentaries": {
    params: Record<string, never>;
    result: SandboxCommentary[];
  };
  "bible.commentaryBooks": {
    params: { commentaryId: string };
    result: { commentary: SandboxCommentary; books: SandboxCommentaryBook[] };
  };
  "bible.commentaryChapter": {
    params: { commentaryId: string; bookId: string; chapter: number };
    result: SandboxCommentaryChapter;
  };
  "bible.commentaryProfiles": {
    params: { commentaryId: string };
    result: SandboxCommentaryProfile[];
  };
  "bible.commentaryProfile": {
    params: { commentaryId: string; profileId: string };
    result: SandboxCommentaryProfile & { content: string[] };
  };
  "bible.datasets": { params: Record<string, never>; result: SandboxDataset[] };
  "bible.datasetBooks": {
    params: { datasetId: string };
    result: { dataset: SandboxDataset; books: SandboxDatasetBook[] };
  };
  "bible.datasetChapter": {
    params: { datasetId: string; bookId: string; chapter: number };
    result: SandboxDatasetChapter;
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
