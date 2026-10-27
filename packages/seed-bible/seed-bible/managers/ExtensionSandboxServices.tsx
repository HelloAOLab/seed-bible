import * as z from "zod/v4";
import type { ReadonlySignal } from "@preact/signals";
import hash from "hash.js";
import { useEffect, useRef } from "preact/hooks";
import { v4 as uuid } from "uuid";
import { useI18n } from "../i18n";
import type { HighlightsManager } from "./HighlightsManager";
import type { Annotation, AnnotationsManager } from "./AnnotationsManager";
import type { Save, SavesManager } from "./SavesManager";
import type { ReadingHistoryManager } from "./ReadingHistoryManager";
import type { LoginManager } from "./LoginManager";
import type {
  DiscoverManager,
  DiscoverReference,
  DiscoverResult,
} from "./DiscoverManager";
import type { ChatParticipant, ChatsManager } from "./ChatsManager";
import type { ModalManager } from "./ModalManager";
import type { ExtensionSettingsManager } from "./ExtensionSettingsManager";
import { SensitiveSettingsError } from "./ExtensionSensitiveSettings";
import {
  createSandboxBible,
  SandboxBibleUnavailableError,
  type SandboxBibleData,
} from "./ExtensionSandboxBible";
import type { FriendsManager } from "./FriendsManager";
import type { SearchManager } from "./SearchManager";
import type { AppState } from "./SeedBibleStateManager";
import {
  createSandboxAudio,
  SandboxAudioError,
  type SandboxAudioContext,
} from "./ExtensionSandboxAudio";
import {
  browserMediaCapture,
  SandboxCaptureDialog,
  type SandboxCaptureKind,
  type SandboxCaptureOutcome,
  type SandboxMediaCapture,
} from "./ExtensionSandboxCapture";
import type {
  SandboxDiscoverResult,
  SandboxErrorCode,
  SandboxHostEvent,
  SandboxHostRequestKind,
  SandboxHostRequests,
  SandboxJsonValue,
  SandboxMethod,
  SandboxMethods,
  SandboxPermission,
  SandboxReference,
  SandboxState,
} from "../extensions/protocol";

/** A refusal the broker sends back to the frame as-is. */
export class SandboxBrokerError extends Error {
  constructor(
    readonly code: SandboxErrorCode,
    message: string
  ) {
    super(message);
  }
}

/**
 * An id for a person that's stable per extension but reveals neither: the
 * same for a user's own `sb.identity` and for them as someone else's friend
 * or session participant, and different for every extension.
 */
export function pseudonymousIdentity(
  extensionId: string,
  userId: string
): string {
  return hash
    .sha256()
    .update(`seed-bible-extension-identity:${extensionId}:${userId}`)
    .digest("hex")
    .slice(0, 32);
}

/** The app managers the phase 2 services reach. */
export interface SandboxServicesContext {
  highlights: Pick<
    HighlightsManager,
    "readChapterHighlights" | "highlightVerses" | "unhighlightVerses"
  >;
  annotations: Pick<
    AnnotationsManager,
    | "listAnnotationsForChapter"
    | "saveAnnotationAndRefresh"
    | "deleteAnnotationAndRefresh"
  >;
  saves: Pick<SavesManager, "saves" | "addSave" | "removeSave">;
  readingHistory: Pick<ReadingHistoryManager, "getReadingEvents">;
  login: Pick<LoginManager, "userId" | "profile">;
  bibleData: SandboxBibleData &
    Pick<SandboxAudioContext["bibleData"], "getAudioTimings">;
  search: Pick<SearchManager, "searchVerses">;
  discover: Pick<DiscoverManager, "registerDiscoverProvider">;
  chats: Pick<ChatsManager, "registerProvider" | "chats">;
  modals: Pick<ModalManager, "openModal" | "closeModal">;
  extensions: {
    registerSettingsPanel: (
      extensionId: string,
      render: () => preact.ComponentChildren
    ) => () => void;
  };
  extensionSettings: Pick<
    ExtensionSettingsManager,
    "getValue" | "fetchWithSensitiveValues"
  >;
  theme: {
    themeCssVariables: ReadonlySignal<string>;
    currentTheme: ReadonlySignal<{ highlightColors: object }>;
    googleFontFamiliesToLoad: ReadonlySignal<string[]>;
  };
  friends: Pick<FriendsManager, "friends">;
  textToSpeech: SandboxAudioContext["textToSpeech"];
  audioPlayback: SandboxAudioContext["audioPlayback"];
  tabs: SandboxAudioContext["tabs"];
  app: Pick<AppState, "currentReadingState">;
  /** Defaults to the browser's microphone and camera. */
  mediaCapture?: SandboxMediaCapture;
}

/** What the services need from the session running them. */
export interface SandboxSessionApi {
  extensionId: string;
  extensionTitle: string;
  network: readonly string[];
  context: SandboxServicesContext;
  has: (permission: SandboxPermission) => boolean;
  /** Asks the background frame, and waits up to `timeoutMs` for its answer. */
  requestFromBackground: <K extends SandboxHostRequestKind>(
    kind: K,
    payload: SandboxHostRequests[K]["payload"],
    timeoutMs: number
  ) => Promise<unknown>;
  sendToBackground: (event: SandboxHostEvent) => void;
  /** Starts a view frame in `container`; returns what tears it down. */
  connectView: (
    view: string,
    surface: "modal" | "settings",
    id: string,
    props: SandboxJsonValue,
    container: HTMLElement,
    title: string
  ) => () => void;
  /** Whether the user is interacting with this extension right now. */
  userIsInteracting: () => boolean;
  /** Runs `cleanup` when the session ends. */
  onDestroy: (cleanup: () => void) => void;
}

export interface SandboxServiceSpec {
  schema: z.ZodType;
  /** Only the extension's main code (its background frame) may call it. */
  backgroundOnly?: boolean;
}

const DISCOVER_TIMEOUT_MS = 5_000;
const CHAT_TIMEOUT_MS = 60_000;
const MAX_HISTORY_RANGE_MS = 366 * 24 * 60 * 60 * 1000;
const MAX_NOTE_LENGTH = 10_000;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_CHAT_MESSAGES = 100;
const MAX_CLIPBOARD_LENGTH = 100_000;
const DEFAULT_RECORDING_SECONDS = 60;
const MAX_RECORDING_SECONDS = 300;

const bookIdSchema = z.string().regex(/^[A-Z0-9]{3}$/);
const translationIdSchema = z.string().regex(/^[A-Za-z0-9_.-]{1,64}$/);
const chapterSchema = z.number().int().min(1).max(200);
const verseSchema = z.number().int().min(1).max(200);
const versesSchema = z.array(verseSchema).min(1).max(200);
const idSchema = z.string().regex(/^[A-Za-z0-9_.-]{1,64}$/);
const chapterRefSchema = z.object({
  translationId: translationIdSchema,
  bookId: bookIdSchema,
  chapter: chapterSchema,
});
const verseOrRangeSchema = z.union([
  verseSchema,
  z.tuple([verseSchema, verseSchema]).refine(([a, b]) => a <= b),
]);
const referenceSchema = z.object({
  bookId: bookIdSchema,
  chapter: chapterSchema,
  verse: verseSchema.optional(),
  endChapter: chapterSchema.optional(),
  endVerse: verseSchema.optional(),
});
const discoverResultsSchema = z
  .array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("content"),
        id: z.string().min(1).max(200),
        title: z.string().min(1).max(200),
        description: z.string().max(2000),
        reference: referenceSchema,
        verses: z.array(verseSchema).max(200).optional(),
        author: z.string().max(100).optional(),
        image: z.string().max(2000).optional(),
      }),
      z.object({
        type: z.literal("cross-reference"),
        reference: referenceSchema,
        crossReference: referenceSchema,
      }),
      z.object({
        type: z.literal("study-note"),
        reference: referenceSchema,
        text: z.string().min(1).max(5000),
      }),
    ])
  )
  .max(50);

export const SANDBOX_SERVICE_SPECS: Partial<
  Record<SandboxMethod, SandboxServiceSpec>
> = {
  "highlights.colors": { schema: z.object({}) },
  "highlights.list": {
    schema: chapterRefSchema,
  },
  "highlights.add": {
    schema: chapterRefSchema.extend({
      verses: versesSchema,
      colorId: z.string().regex(/^[A-Za-z0-9_-]{1,32}$/),
    }),
  },
  "highlights.remove": {
    schema: chapterRefSchema.extend({ verses: versesSchema }),
  },
  "notes.list": {
    schema: z.object({ bookId: bookIdSchema, chapter: chapterSchema }),
  },
  "notes.create": {
    schema: z.object({
      bookId: bookIdSchema,
      chapter: chapterSchema,
      verses: versesSchema.optional(),
      text: z.string().min(1).max(MAX_NOTE_LENGTH),
    }),
  },
  "notes.update": {
    schema: z.object({
      id: z.string().min(1).max(200),
      bookId: bookIdSchema,
      chapter: chapterSchema,
      text: z.string().min(1).max(MAX_NOTE_LENGTH),
    }),
  },
  "notes.delete": {
    schema: z.object({
      id: z.string().min(1).max(200),
      bookId: bookIdSchema,
      chapter: chapterSchema,
    }),
  },
  "saves.list": { schema: z.object({}) },
  "saves.add": {
    schema: chapterRefSchema.extend({
      verse: verseOrRangeSchema.optional(),
      categories: z.array(z.string().min(1).max(64)).min(1).max(10).optional(),
    }),
  },
  "saves.remove": {
    schema: z.object({ id: z.string().min(1).max(200) }),
  },
  "history.list": {
    schema: z
      .object({ from: z.number().int().min(0), to: z.number().int().min(0) })
      .refine(
        ({ from, to }) => from <= to && to - from <= MAX_HISTORY_RANGE_MS,
        {
          message: "`to` must be after `from`, and at most a year after it.",
        }
      ),
  },
  "profile.get": { schema: z.object({}) },
  "bible.translations": { schema: z.object({}) },
  "bible.books": { schema: z.object({ translationId: translationIdSchema }) },
  "bible.chapter": { schema: chapterRefSchema },
  "bible.commentaries": { schema: z.object({}) },
  "bible.commentaryBooks": { schema: z.object({ commentaryId: idSchema }) },
  "bible.commentaryChapter": {
    schema: z.object({
      commentaryId: idSchema,
      bookId: bookIdSchema,
      chapter: chapterSchema,
    }),
  },
  "bible.commentaryProfiles": { schema: z.object({ commentaryId: idSchema }) },
  "bible.commentaryProfile": {
    schema: z.object({
      commentaryId: idSchema,
      profileId: z.string().regex(/^[A-Za-z0-9_.-]{1,128}$/),
    }),
  },
  "bible.search": {
    schema: z
      .object({
        translationId: translationIdSchema,
        query: z.string().trim().min(1).max(200),
        bookId: bookIdSchema.optional(),
        chapter: chapterSchema.optional(),
        page: z.number().int().min(1).max(100).optional(),
        perPage: z.number().int().min(1).max(50).optional(),
      })
      .refine(({ bookId, chapter }) => chapter === undefined || bookId, {
        message: "Give a `bookId` to search one chapter.",
      }),
  },
  "bible.datasets": { schema: z.object({}) },
  "bible.datasetBooks": { schema: z.object({ datasetId: idSchema }) },
  "bible.datasetChapter": {
    schema: z.object({
      datasetId: idSchema,
      bookId: bookIdSchema,
      chapter: chapterSchema,
    }),
  },
  "discover.register": {
    schema: z.object({
      id: idSchema,
      title: z.string().min(1).max(100),
      description: z.string().max(300),
    }),
    backgroundOnly: true,
  },
  "discover.unregister": {
    schema: z.object({ id: idSchema }),
    backgroundOnly: true,
  },
  "chats.register": {
    schema: z.object({
      id: idSchema,
      name: z.string().min(1).max(100),
      shared: z.boolean().optional(),
    }),
    backgroundOnly: true,
  },
  "chats.unregister": {
    schema: z.object({ id: idSchema }),
    backgroundOnly: true,
  },
  respond: {
    schema: z.object({
      requestId: z.number().int(),
      value: z.unknown().optional(),
      error: z.string().max(2000).optional(),
    }),
    backgroundOnly: true,
  },
  "modals.open": {
    schema: z
      .object({
        title: z.string().min(1).max(120),
        message: z.string().min(1).max(2000).optional(),
        view: z.string().min(1).max(64).optional(),
        props: z.unknown().optional(),
      })
      .refine(
        ({ message, view }) => (message === undefined) !== (view === undefined),
        { message: "Give a modal either a `message` or a `view`." }
      ),
  },
  "settings.registerPanel": {
    schema: z.object({ view: z.string().min(1).max(64) }),
    backgroundOnly: true,
  },
  "sensitive.fetch": {
    schema: z.object({
      url: z.string().min(1).max(4000),
      method: z
        .enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"])
        .optional(),
      body: z.unknown().optional(),
      proxy: z.string().max(100).optional(),
    }),
  },
  pong: { schema: z.object({}), backgroundOnly: true },
  "friends.list": { schema: z.object({}) },
  "audio.readAloud": {
    schema: chapterRefSchema
      .extend({
        fromVerse: verseSchema.optional(),
        toVerse: verseSchema.optional(),
      })
      .refine(
        ({ fromVerse, toVerse }) => (fromVerse ?? 1) <= (toVerse ?? 200),
        { message: "`toVerse` can't be before `fromVerse`." }
      ),
  },
  "audio.play": {
    schema: z.object({ url: z.url({ protocol: /^https$/ }).max(4000) }),
  },
  "audio.playNarration": {
    schema: chapterRefSchema.extend({
      reader: z.string().min(1).max(64).optional(),
    }),
  },
  "audio.narrators": { schema: chapterRefSchema },
  "audio.pause": { schema: z.object({}) },
  "audio.resume": { schema: z.object({}) },
  "audio.seek": {
    schema: z.object({ position: z.number().finite().min(0) }),
  },
  "audio.stop": { schema: z.object({}) },
  "clipboard.writeText": {
    schema: z.object({ text: z.string().max(MAX_CLIPBOARD_LENGTH) }),
  },
  "devices.recordAudio": {
    schema: z.object({
      maxSeconds: z.number().int().min(1).max(MAX_RECORDING_SECONDS).optional(),
    }),
  },
  "devices.takePhoto": { schema: z.object({}) },
};

const NOTE_TAG_PREFIX = "extension:";

function htmlToText(html: string): string {
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    // One line per block, so paragraphs don't run together.
    for (const block of doc.body.querySelectorAll("p, div, br, li")) {
      block.append("\n");
    }
    return (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
  }
  return html.replace(/<[^>]*>/g, "").trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain text as the note editor's HTML: a paragraph per blank-line block. */
function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function annotationVerses(annotation: Annotation): number[] | null {
  if (annotation.verseNumbers?.length) {
    return [...annotation.verseNumbers];
  }
  if (annotation.verseNumber) {
    const end = annotation.endVerseNumber ?? annotation.verseNumber;
    const verses: number[] = [];
    for (let v = annotation.verseNumber; v <= end; v++) {
      verses.push(v);
    }
    return verses;
  }
  return null;
}

function toDiscoverReference(reference: SandboxReference): DiscoverReference {
  return {
    book: reference.bookId,
    chapter: reference.chapter,
    verse: reference.verse,
    endChapter: reference.endChapter,
    endVerse: reference.endVerse,
  };
}

function participantName(participant: ChatParticipant | undefined) {
  const name = participant?.name;
  if (!name) {
    return null;
  }
  return typeof name === "string" ? name : name.defaultValue;
}

/**
 * Hosts one of the extension's views in a host-drawn surface (a pane, a
 * modal or a settings panel), connecting its frame when it mounts.
 */
export function SandboxViewFrame({
  connect,
  minHeight,
}: {
  connect: (container: HTMLElement) => () => void;
  minHeight?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) {
      return;
    }
    return connect(ref.current);
  }, []);
  return <div ref={ref} style={{ width: "100%", height: "100%", minHeight }} />;
}

function SandboxMessage({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">{message}</p>
      <div className="sb-confirm-delete-actions">
        <button
          type="button"
          className="sb-extension-consent-allow"
          onClick={onClose}
        >
          {t("extension-modal-ok")}
        </button>
      </div>
    </div>
  );
}

export type SandboxServiceHandler = (
  params: unknown,
  call: { isBackground: boolean }
) => unknown;

export interface SandboxServices {
  handlers: Partial<Record<SandboxMethod, SandboxServiceHandler>>;
  /** The part of the frames' state these services keep. Reads signals. */
  state: () => Pick<SandboxState, "playback">;
}

/**
 * The phase 2 features of one session: reading and writing the user's
 * data, Discover and chat providers, modals, settings panels, sensitive
 * fetch and Bible text. The session has already validated `params` against
 * `SANDBOX_SERVICE_SPECS` and checked the permission
 * `SANDBOX_METHOD_PERMISSIONS` lists for it.
 */
export function createSandboxServices(
  session: SandboxSessionApi
): SandboxServices {
  const { extensionId, extensionTitle, context, has } = session;
  const noteTag = `${NOTE_TAG_PREFIX}${extensionId}`;
  const scopedId = (id: string) => `sandbox:${extensionId}:${id}`;
  const signedIn = () => context.login.userId.peek() !== null;
  const requireSignedIn = () => {
    if (!signedIn()) {
      throw new SandboxBrokerError(
        "unavailable",
        "The user isn't signed in, so this can't be saved."
      );
    }
  };
  const highlightColors = () =>
    Object.keys(context.theme.currentTheme.peek().highlightColors);
  /** Nothing out of nowhere: only in answer to the user. */
  const requireInteraction = (what: string) => {
    if (!session.userIsInteracting()) {
      throw new SandboxBrokerError(
        "invalid_request",
        `${what} only works right after the user interacts with this extension.`
      );
    }
  };

  const discoverProviders = new Map<string, () => void>();
  const chatProviders = new Map<string, () => void>();
  let openModalId: string | null = null;
  let openCaptureId: string | null = null;
  let removeSettingsPanel: (() => void) | null = null;

  const audio = createSandboxAudio(context);
  /** The tab whose player shows the extension's audio: the one in view. */
  const playerTab = () => {
    const readingState =
      context.app.currentReadingState.peek()?.tab.readingState;
    if (!readingState) {
      throw new SandboxBrokerError(
        "unavailable",
        "There's no reader open to play in."
      );
    }
    return readingState;
  };
  /** Passes on why the player refused. */
  const playing = async <T,>(start: () => Promise<T>): Promise<T> => {
    try {
      return await start();
    } catch (err) {
      if (err instanceof SandboxAudioError) {
        throw new SandboxBrokerError(err.code, err.message);
      }
      throw err;
    }
  };

  session.onDestroy(() => {
    for (const unregister of [
      ...discoverProviders.values(),
      ...chatProviders.values(),
    ]) {
      unregister();
    }
    discoverProviders.clear();
    chatProviders.clear();
    removeSettingsPanel?.();
    if (openModalId) {
      context.modals.closeModal(openModalId);
    }
    if (openCaptureId) {
      context.modals.closeModal(openCaptureId);
    }
    audio.dispose();
  });

  const capture = (kind: SandboxCaptureKind, maxSeconds: number) => {
    if (openCaptureId) {
      throw new SandboxBrokerError(
        "limit_exceeded",
        "This extension is already recording or taking a photo."
      );
    }
    requireInteraction(kind === "audio" ? "Recording audio" : "Taking a photo");
    const id = scopedId(`capture-${uuid()}`);
    openCaptureId = id;
    return new Promise<SandboxMethods["devices.takePhoto"]["result"]>(
      (resolve, reject) => {
        const done = (outcome: SandboxCaptureOutcome) => {
          if (openCaptureId !== id) {
            return;
          }
          openCaptureId = null;
          context.modals.closeModal(id);
          if ("blob" in outcome) {
            const { blob } = outcome;
            blob
              .arrayBuffer()
              .then((bytes) => resolve({ type: blob.type, bytes }), reject);
          } else if ("error" in outcome) {
            reject(
              new SandboxBrokerError(
                "unavailable",
                `The ${kind === "audio" ? "microphone" : "camera"} couldn't be used: ${outcome.error}`
              )
            );
          } else {
            resolve(null);
          }
        };
        context.modals.openModal({
          id,
          title: extensionTitle,
          content: () => (
            <SandboxCaptureDialog
              kind={kind}
              extensionTitle={extensionTitle}
              maxSeconds={maxSeconds}
              capture={context.mediaCapture ?? browserMediaCapture}
              onDone={done}
            />
          ),
          onDismiss: () => done({ cancelled: true }),
          useCasualOSApp: false,
        });
      }
    );
  };

  const findOwnNote = async (id: string, bookId: string, chapter: number) => {
    const note = (
      await context.annotations.listAnnotationsForChapter(bookId, chapter)
    ).find((annotation) => annotation.id === id);
    if (!note) {
      throw new SandboxBrokerError(
        "not_found",
        `There's no note '${id}' here.`
      );
    }
    if (!note.data.tags?.includes(noteTag)) {
      throw new SandboxBrokerError(
        "permission_denied",
        "An extension can only change or delete the notes it added."
      );
    }
    return note;
  };

  /** Images load in the app's page, so only from hosts the user approved. */
  const allowedImage = (image: string | undefined) => {
    if (!image) {
      return undefined;
    }
    try {
      const url = new URL(image);
      return url.protocol === "https:" && session.network.includes(url.host)
        ? url.href
        : undefined;
    } catch {
      return undefined;
    }
  };

  const toDiscoverResult = (
    providerId: string,
    result: SandboxDiscoverResult
  ): DiscoverResult => {
    switch (result.type) {
      case "content":
        return {
          type: "content",
          title: result.title,
          description: result.description,
          reference: toDiscoverReference(result.reference),
          verses: result.verses,
          author: result.author ?? extensionTitle,
          image: allowedImage(result.image),
          onClick: () =>
            session.sendToBackground({
              type: "event",
              name: "discover.select",
              providerId,
              resultId: result.id,
            }),
        };
      case "cross-reference":
        return {
          type: "cross-reference",
          reference: toDiscoverReference(result.reference),
          crossReference: toDiscoverReference(result.crossReference),
        };
      case "study-note":
        return {
          type: "study-note",
          reference: toDiscoverReference(result.reference),
          content: <p>{result.text}</p>,
        };
    }
  };

  type Params<M extends SandboxMethod> = SandboxMethods[M]["params"];

  /** `sb.bible`, with a failed load passed on as `unavailable`. */
  const bibleHandlers = (): SandboxServices["handlers"] =>
    Object.fromEntries(
      Object.entries(createSandboxBible(context.bibleData, context.search)).map(
        ([method, read]) => [
          method,
          async (params: unknown) => {
            try {
              return await (read as (params: unknown) => Promise<unknown>)(
                params
              );
            } catch (err) {
              if (err instanceof SandboxBibleUnavailableError) {
                throw new SandboxBrokerError("unavailable", err.message);
              }
              throw err;
            }
          },
        ]
      )
    );

  const handlers: SandboxServices["handlers"] = {
    "highlights.colors": () => highlightColors(),

    "highlights.list": async (params) => {
      const { translationId, bookId, chapter } =
        params as Params<"highlights.list">;
      const { highlights } = await context.highlights.readChapterHighlights(
        translationId,
        bookId,
        chapter
      );
      return highlights.map((h) => ({ verse: h.verse, colorId: h.colorId }));
    },

    "highlights.add": async (params) => {
      const { translationId, bookId, chapter, verses, colorId } =
        params as Params<"highlights.add">;
      if (!highlightColors().includes(colorId)) {
        throw new SandboxBrokerError(
          "invalid_request",
          `Unknown highlight color '${colorId}'; see sb.highlights.colors().`
        );
      }
      await context.highlights.highlightVerses(
        translationId,
        bookId,
        chapter,
        verses,
        { colorId }
      );
      return null;
    },

    "highlights.remove": async (params) => {
      const { translationId, bookId, chapter, verses } =
        params as Params<"highlights.remove">;
      await context.highlights.unhighlightVerses(
        translationId,
        bookId,
        chapter,
        verses
      );
      return null;
    },

    "notes.list": async (params) => {
      const { bookId, chapter } = params as Params<"notes.list">;
      if (!signedIn()) {
        return [];
      }
      const notes = await context.annotations.listAnnotationsForChapter(
        bookId,
        chapter
      );
      return notes.map((note) => ({
        id: note.id,
        verses: annotationVerses(note),
        text: htmlToText(note.data.html),
        createdAt: note.data.createdAtMs ?? null,
        updatedAt: note.data.updatedAtMs ?? null,
        addedByThisExtension: note.data.tags?.includes(noteTag) ?? false,
      }));
    },

    "notes.create": async (params) => {
      const { bookId, chapter, verses, text } =
        params as Params<"notes.create">;
      requireSignedIn();
      const now = Date.now();
      const saved = await context.annotations.saveAnnotationAndRefresh({
        id: `annotation_${uuid()}`,
        bookId,
        chapterNumber: chapter,
        verseNumber: null,
        endVerseNumber: null,
        verseNumbers: verses ?? null,
        data: {
          type: "comment",
          html: textToHtml(text),
          userId: context.login.userId.peek(),
          createdAtMs: now,
          updatedAtMs: now,
          // Marks it as this extension's, so it may change it later and the
          // user can tell where it came from.
          tags: [noteTag],
        },
      });
      return { id: saved.id };
    },

    "notes.update": async (params) => {
      const { id, bookId, chapter, text } = params as Params<"notes.update">;
      requireSignedIn();
      const note = await findOwnNote(id, bookId, chapter);
      await context.annotations.saveAnnotationAndRefresh({
        ...note,
        data: { ...note.data, html: textToHtml(text), updatedAtMs: Date.now() },
      });
      return null;
    },

    "notes.delete": async (params) => {
      const { id, bookId, chapter } = params as Params<"notes.delete">;
      requireSignedIn();
      await context.annotations.deleteAnnotationAndRefresh(
        await findOwnNote(id, bookId, chapter)
      );
      return null;
    },

    "saves.list": () =>
      context.saves.saves.peek().map((save: Save) => ({
        id: save.id,
        translationId: save.translationId,
        bookId: save.bookId,
        chapter: save.chapterNumber,
        verse: save.verse ?? null,
        categories: [...save.categories],
        createdAt: save.createdAt,
      })),

    "saves.add": async (params) => {
      const { translationId, bookId, chapter, verse, categories } =
        params as Params<"saves.add">;
      // Checked first: `addSave` would otherwise prompt the user to sign in.
      requireSignedIn();
      await context.saves.addSave(translationId, bookId, chapter, {
        verse,
        categories,
      });
      return null;
    },

    "saves.remove": async (params) => {
      const { id } = params as Params<"saves.remove">;
      requireSignedIn();
      if (!context.saves.saves.peek().some((save) => save.id === id)) {
        throw new SandboxBrokerError("not_found", `There's no save '${id}'.`);
      }
      await context.saves.removeSave(id);
      return null;
    },

    "history.list": async (params) => {
      const { from, to } = params as Params<"history.list">;
      const events = await context.readingHistory.getReadingEvents(
        Math.floor(from / 1000),
        Math.ceil(to / 1000)
      );
      return [...events].slice(0, 5000).map((event) => ({
        bookId: event.bookId,
        chapter: event.chapter,
        start: event.start * 1000,
        end: event.end * 1000,
      }));
    },

    "profile.get": () => {
      const userId = context.login.userId.peek();
      const profile = context.login.profile.peek();
      return userId && profile
        ? {
            userId,
            name: profile.name,
            pictureUrl: profile.pictureUrl ?? null,
          }
        : null;
    },

    ...bibleHandlers(),

    "discover.register": (params) => {
      const { id, title, description } = params as Params<"discover.register">;
      discoverProviders.get(id)?.();
      discoverProviders.set(
        id,
        context.discover.registerDiscoverProvider({
          id: scopedId(id),
          title,
          description,
          discover: async (discoverContext) => {
            // Checked again here: the permission may have been revoked.
            if (!has("reading:position")) {
              return [];
            }
            try {
              const results = discoverResultsSchema.parse(
                await session.requestFromBackground(
                  "discover",
                  {
                    providerId: id,
                    translationId: discoverContext.translationId,
                    bookId: discoverContext.book,
                    chapter: discoverContext.chapter,
                    language: discoverContext.language,
                  },
                  DISCOVER_TIMEOUT_MS
                )
              );
              return results.map((result) => toDiscoverResult(id, result));
            } catch (err) {
              console.warn(
                `Extension '${extensionId}' Discover provider '${id}' failed:`,
                err
              );
              return [];
            }
          },
        })
      );
      return null;
    },

    "discover.unregister": (params) => {
      const { id } = params as Params<"discover.unregister">;
      discoverProviders.get(id)?.();
      discoverProviders.delete(id);
      return null;
    },

    "chats.register": (params) => {
      const { id, name, shared } = params as Params<"chats.register">;
      if (shared && !has("chat:shared")) {
        throw new SandboxBrokerError(
          "permission_denied",
          "Taking part in shared chats needs the 'chat:shared' permission."
        );
      }
      chatProviders.get(id)?.();
      chatProviders.set(
        id,
        context.chats.registerProvider({
          id: scopedId(id),
          name: `${name}`,
          get supportsSharedChats() {
            return Boolean(shared) && has("chat:shared");
          },
          generateResponse: async (chat) => {
            const isShared = context.chats.chats
              .peek()
              .some(
                (session) =>
                  session.id === chat.chatId &&
                  "isShared" in session &&
                  session.isShared === true
              );
            // Checked on every message: permissions can be revoked, and a
            // provider could have been added to a shared chat some other way.
            if (!has("chat:respond") || (isShared && !has("chat:shared"))) {
              return null;
            }
            const byId = new Map(chat.participants.map((p) => [p.id, p]));
            const messages = chat.messages
              .filter((message) => message.type === "text")
              .slice(-MAX_CHAT_MESSAGES)
              .map((message) => ({
                author: participantName(byId.get(message.authors[0] ?? "")),
                fromThisProvider: message.authors.includes(chat.participant.id),
                text: message.type === "text" ? message.text : "",
                timeMs: message.timeMs,
              }));
            try {
              const text = await session.requestFromBackground(
                "chat",
                {
                  providerId: id,
                  chatId: chat.chatId,
                  shared: isShared,
                  messages,
                },
                CHAT_TIMEOUT_MS
              );
              return typeof text === "string" && text.trim()
                ? { type: "text" as const, text: text.slice(0, 20_000) }
                : null;
            } catch (err) {
              console.warn(
                `Extension '${extensionId}' chat provider '${id}' failed:`,
                err
              );
              return null;
            }
          },
        })
      );
      return null;
    },

    "chats.unregister": (params) => {
      const { id } = params as Params<"chats.unregister">;
      chatProviders.get(id)?.();
      chatProviders.delete(id);
      return null;
    },

    "modals.open": (params) => {
      const { title, message, view, props } = params as Params<"modals.open">;
      if (openModalId) {
        throw new SandboxBrokerError(
          "limit_exceeded",
          "This extension already has a dialog open."
        );
      }
      requireInteraction("Opening a dialog");
      const id = scopedId(`modal-${uuid()}`);
      openModalId = id;
      return new Promise<null>((resolve) => {
        const close = () => {
          if (openModalId === id) {
            openModalId = null;
            context.modals.closeModal(id);
            resolve(null);
          }
        };
        context.modals.openModal({
          id,
          title: `${extensionTitle}: ${title}`,
          content: message
            ? () => <SandboxMessage message={message} onClose={close} />
            : () => (
                <SandboxViewFrame
                  minHeight="320px"
                  connect={(container) =>
                    session.connectView(
                      view!,
                      "modal",
                      id,
                      (props ?? null) as SandboxJsonValue,
                      container,
                      `${extensionTitle}: ${title}`
                    )
                  }
                />
              ),
          onDismiss: close,
          useCasualOSApp: false,
        });
      });
    },

    "settings.registerPanel": (params) => {
      const { view } = params as Params<"settings.registerPanel">;
      removeSettingsPanel?.();
      const id = scopedId("settings");
      removeSettingsPanel = context.extensions.registerSettingsPanel(
        extensionId,
        () => (
          <SandboxViewFrame
            minHeight="320px"
            connect={(container) =>
              session.connectView(
                view,
                "settings",
                id,
                null,
                container,
                extensionTitle
              )
            }
          />
        )
      );
      return null;
    },

    "sensitive.fetch": async (params) => {
      const { url, method, body, proxy } = params as Params<"sensitive.fetch">;
      try {
        const response =
          await context.extensionSettings.fetchWithSensitiveValues(
            extensionId,
            { url, method, body, proxy }
          );
        const text = await response.text();
        if (text.length > MAX_RESPONSE_BYTES) {
          throw new SandboxBrokerError(
            "limit_exceeded",
            "The response is larger than 1 MB."
          );
        }
        return {
          status: response.status,
          ok: response.ok,
          contentType: response.headers.get("content-type"),
          body: text,
        };
      } catch (err) {
        if (err instanceof SensitiveSettingsError) {
          throw new SandboxBrokerError(
            "unavailable",
            `${err.code}: ${err.message}`
          );
        }
        throw err;
      }
    },

    "friends.list": () =>
      signedIn()
        ? context.friends.friends.peek().map((friend) => ({
            id: pseudonymousIdentity(extensionId, friend.userId),
            name: friend.name,
            pictureUrl: friend.pictureUrl,
          }))
        : [],

    "audio.play": (params) => {
      const { url } = params as Params<"audio.play">;
      requireInteraction("Playing audio");
      // It plays in the app's page, so only from hosts the user approved.
      if (!session.network.includes(new URL(url).host)) {
        throw new SandboxBrokerError(
          "invalid_request",
          `Audio can only be played from the manifest's network hosts, not ${new URL(url).host}.`
        );
      }
      return audio.playFile(url, playerTab());
    },

    "audio.playNarration": (params) => {
      const ref = params as Params<"audio.playNarration">;
      requireInteraction("Playing narration");
      const readingState = playerTab();
      return playing(() => audio.playNarration(ref, readingState));
    },

    "audio.narrators": (params) =>
      playing(() => audio.narrators(params as Params<"audio.narrators">)),

    "audio.readAloud": (params) => {
      const ref = params as Params<"audio.readAloud">;
      requireInteraction("Reading aloud");
      const readingState = playerTab();
      return playing(() => audio.readAloud(ref, readingState));
    },

    // These only ever reach what this extension is playing.
    "audio.pause": () => {
      audio.pause();
      return null;
    },

    "audio.resume": () => {
      requireInteraction("Resuming playback");
      audio.resume();
      return null;
    },

    "audio.seek": (params) => {
      audio.seek((params as Params<"audio.seek">).position);
      return null;
    },

    "audio.stop": () => {
      audio.stop();
      return null;
    },

    "clipboard.writeText": async (params) => {
      const { text } = params as Params<"clipboard.writeText">;
      requireInteraction("Copying");
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        throw new SandboxBrokerError(
          "unavailable",
          `The browser didn't allow copying: ${String(err)}`
        );
      }
      return null;
    },

    "devices.recordAudio": (params) => {
      const { maxSeconds } = params as Params<"devices.recordAudio">;
      return capture("audio", maxSeconds ?? DEFAULT_RECORDING_SECONDS);
    },

    "devices.takePhoto": () => capture("photo", 0),
  };

  return { handlers, state: () => ({ playback: audio.playback() }) };
}
