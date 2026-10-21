import { signal } from "@preact/signals";
import type { Mock } from "vitest";
import {
  createExtensionManager,
  ExtensionInitalizer,
  setupExtensionContext,
  type ExtensionManager,
  type ExtensionManagerOptions,
  type ExtensionMeta,
  type UploadedExtension,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type {
  SandboxFrameConnector,
  SandboxFrameRequest,
} from "@packages/seed-bible/seed-bible/managers/ExtensionSandboxManager";
import type { SandboxConsentRequest } from "@packages/seed-bible/seed-bible/managers/ExtensionPermissions";
import type { SandboxStorageRecords } from "@packages/seed-bible/seed-bible/managers/ExtensionSandboxStorage";
import { createPanes } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import { createDiscoverManager } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import { createAudioPlaybackManager } from "@packages/seed-bible/seed-bible/managers/AudioPlaybackManager";
import type { ChapterHighlight } from "@packages/seed-bible/seed-bible/managers/HighlightsManager";
import type { Annotation } from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import type { Save } from "@packages/seed-bible/seed-bible/managers/SavesManager";
import type { ReadingEvent } from "@packages/seed-bible/seed-bible/managers/ReadingHistoryManager";
import type { ChatProvider } from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import type { UserProfile } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type {
  BibleTool,
  ToolsManager,
} from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import type { BibleSelectedVerse } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { Friend } from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import type { SpeechVerse } from "@packages/seed-bible/seed-bible/managers/TextToSpeechManager";
import type {
  SandboxCaptureKind,
  SandboxMediaCapture,
} from "@packages/seed-bible/seed-bible/managers/ExtensionSandboxCapture";
import type { SandboxExtension } from "@packages/seed-bible/seed-bible/extensions";
import {
  SANDBOX_START_KEY,
  type SandboxHostMessage,
  type SandboxInit,
  type SandboxMethod,
  type SandboxMethods,
} from "@packages/seed-bible/seed-bible/extensions/protocol";

/*
 * Shared setup for the sandboxed-extension tests. Everything is real — the
 * SDK, the broker, `ExtensionManager`, the panes manager — except three
 * boundaries jsdom can't provide or a test must control: the iframe (frames
 * run in-process over a `MessageChannel`), the network (bundles are served
 * from memory), and the app's toolbars (recorded, so a test can click them).
 *
 * Test files using this must also mock `I18nManager` (see
 * `ExtensionSandbox.test.tsx`); `vi.mock` only takes effect in the test file.
 */

type RegisteredTool = BibleTool<unknown> & {
  onSelect?: () => void;
  getItems?: () => { id: string; onSelect?: () => void }[];
};

/**
 * Stands in for the app's toolbars: records what's registered by id, with the
 * same replace-by-id rule as the real `ToolsManager`, so a test can see and
 * click what a toolbar would render.
 */
function createRecordingTools() {
  const surfaces = {
    toolbar: new Map<string, RegisteredTool>(),
    verse: new Map<string, RegisteredTool>(),
    quick: new Map<string, RegisteredTool>(),
    belowReader: new Map<string, RegisteredTool>(),
  };
  const register =
    (surface: keyof typeof surfaces) => (tool: RegisteredTool) => {
      surfaces[surface].set(tool.id, tool);
      return () => surfaces[surface].delete(tool.id);
    };
  const unregister = (surface: keyof typeof surfaces) => (id: string) => {
    surfaces[surface].delete(id);
  };
  const tools = {
    registerToolbarTool: register("toolbar"),
    unregisterToolbarTool: unregister("toolbar"),
    registerVerseToolbarTool: register("verse"),
    unregisterVerseToolbarTool: unregister("verse"),
    registerQuickTool: register("quick"),
    unregisterQuickTool: unregister("quick"),
    registerBelowReaderTool: register("belowReader"),
    unregisterBelowReaderTool: unregister("belowReader"),
  } as unknown as ToolsManager;
  return { tools, surfaces };
}

/**
 * The extension manager's view of the account: the same `userId` and
 * `profile` signals the host context has, as in the app, where both are the
 * one `LoginManager`.
 */
function createLogin(host: SandboxTestHost): LoginManager {
  return {
    userId: host.userId,
    profile: host.profile,
    localConfig: signal<Record<string, unknown>>({}),
    profilePromise: null,
    // Like the real one: a record with no profile yet reads as a blank one.
    getPublicProfile: async (userId: string) =>
      host.publicProfiles.get(userId) ?? { name: "" },
    updateProfile: (data: Partial<UserProfile>) => {
      host.profile.value = {
        ...(host.profile.peek() ?? { name: "" }),
        ...data,
      } as UserProfile;
    },
  } as unknown as LoginManager;
}

/**
 * Stands in for the app's text-to-speech engine, with the same callbacks:
 * a run either finishes on its own or is told it was stopped.
 */
function createSpeech() {
  const isSpeaking = signal(false);
  const currentVerse = signal<number | null>(null);
  const runs: { verses: SpeechVerse[]; lang: string | null }[] = [];
  let current: { onFinished?: () => void; onStopped?: () => void } | null =
    null;
  const stop = () => {
    const stopped = current;
    current = null;
    isSpeaking.value = false;
    currentVerse.value = null;
    stopped?.onStopped?.();
  };
  return {
    runs,
    isSpeaking,
    currentVerse,
    textToSpeech: {
      isSupported: signal(true),
      isSpeaking,
      currentVerse,
      speak: (
        verses: readonly SpeechVerse[],
        options: {
          lang: string | null;
          onFinished?: () => void;
          onStopped?: () => void;
        }
      ) => {
        stop();
        if (verses.length === 0) {
          return;
        }
        runs.push({ verses: [...verses], lang: options.lang });
        current = options;
        isSpeaking.value = true;
      },
      stop,
    },
    /** The engine reaches the end of what it was given. */
    finish: () => {
      const finished = current;
      current = null;
      isSpeaking.value = false;
      currentVerse.value = null;
      finished?.onFinished?.();
    },
  };
}

/**
 * Stands in for the browser playing an `<audio>` element, which jsdom
 * can't: `play()` and `pause()` report the events a browser would, and a
 * test can make the audio advance or end.
 */
function createMedia() {
  const media = {
    /** The URL of each `play()`. */
    played: [] as string[],
    element: null as HTMLMediaElement | null,
    isPlaying: false,
    /** The audio reaches `seconds` of a recording `duration` long. */
    advance(seconds: number, duration = 120) {
      const el = media.element!;
      Object.defineProperty(el, "duration", {
        value: duration,
        configurable: true,
      });
      el.dispatchEvent(new Event("durationchange"));
      el.currentTime = seconds;
      el.dispatchEvent(new Event("timeupdate"));
    },
    end() {
      media.isPlaying = false;
      media.element!.dispatchEvent(new Event("ended"));
    },
  };
  return media;
}

function stubMediaPlayback(media: ReturnType<typeof createMedia>) {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
    this: HTMLMediaElement
  ) {
    media.element = this;
    media.played.push(this.getAttribute("src") ?? "");
    media.isPlaying = true;
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (
    this: HTMLMediaElement
  ) {
    if (media.element === this && media.isPlaying) {
      media.isPlaying = false;
      this.dispatchEvent(new Event("pause"));
    }
  });
}

/**
 * Stands in for the browser's microphone and camera: records what was
 * opened and whether it's still on.
 */
function createMediaCapture() {
  const opened: SandboxCaptureKind[] = [];
  const state = { on: 0, recording: false, fail: null as string | null };
  const mediaCapture: SandboxMediaCapture = {
    open: async (kind) => {
      if (state.fail) {
        throw new Error(state.fail);
      }
      opened.push(kind);
      state.on += 1;
      let closed = false;
      const close = () => {
        if (!closed) {
          closed = true;
          state.on -= 1;
          state.recording = false;
        }
      };
      return {
        stream: null,
        start: () => {
          state.recording = true;
        },
        finish: async () => {
          close();
          return new Blob([kind === "audio" ? "audio-bytes" : "photo-bytes"], {
            type: kind === "audio" ? "audio/webm" : "image/jpeg",
          });
        },
        close,
      };
    },
  };
  return { mediaCapture, opened, state };
}

/** A shared reading session, as `ReaderTab.sharedSession` holds one. */
export function createSharedSession(
  users: {
    userId: string | null;
    connectionId: string;
    name?: string;
    isSelf?: boolean;
    isHost?: boolean;
    isActive?: boolean;
  }[]
) {
  const allUsers = signal(
    users.map((user) => ({
      userId: user.userId,
      connectionId: user.connectionId,
      isSelf: user.isSelf ?? false,
      isActive: user.isActive ?? true,
      profile: user.name ? { name: user.name } : null,
      host: user.isHost ?? false,
    }))
  );
  return {
    allUsers,
    isHost: (user: { host: boolean } | null) => user?.host ?? false,
  };
}

/**
 * Stands in for the CasualOS records server, for `sb.storage` sync: the
 * signed-in user's records, by record name and address.
 */
function createRecords() {
  const data = new Map<string, unknown>();
  const records: SandboxStorageRecords = {
    getData: (async (recordName: string, address: string) => {
      const key = `${recordName}/${address}`;
      return data.has(key)
        ? { success: true, data: structuredClone(data.get(key)) }
        : { success: false, errorCode: "data_not_found" };
    }) as unknown as SandboxStorageRecords["getData"],
    recordData: (async (
      recordName: string,
      address: string,
      value: unknown
    ) => {
      data.set(`${recordName}/${address}`, structuredClone(value));
      return { success: true };
    }) as unknown as SandboxStorageRecords["recordData"],
  };
  return { records, data };
}

export async function sha384(text: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-384", new TextEncoder().encode(text))
  );
  return `sha384-${btoa(String.fromCharCode(...digest))}`;
}

function createHost() {
  const { tools, surfaces } = createRecordingTools();
  const panes = createPanes();
  const modals = createModalManager();
  const discover = createDiscoverManager();
  const selectedVerses = signal<BibleSelectedVerse[]>([]);
  const reading = signal({
    tab: {
      readingState: { selectedVerses },
      sharedSession: null as ReturnType<typeof createSharedSession> | null,
    },
    translationId: "BSB" as string | null,
    bookId: "JHN" as string | null,
    chapterNumber: 3 as number | null,
  });
  const toasts: string[] = [];
  const openedReferences: unknown[] = [];
  const userId = signal<string | null>(null);
  const profile = signal<UserProfile | null>(null);
  /** Other people's public profiles, by user id. */
  const publicProfiles = new Map<string, UserProfile>();

  // The user's data, as the stand-in managers below keep it.
  const highlights = new Map<string, ChapterHighlight[]>();
  const notes = new Map<string, Annotation[]>();
  const saves = signal<Save[]>([]);
  const readingEvents: ReadingEvent[] = [];
  const chatProviders = new Map<string, ChatProvider>();
  const settingsPanels = new Map<string, () => unknown>();
  const sensitiveFetches: unknown[] = [];
  /** How `fetchWithSensitiveValues` answers; a test can replace it. */
  const sensitive = {
    respond: async (): Promise<Response> =>
      new Response("sensitive ok", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
  };
  const chapterKey = (t: string, b: string, c: number) => `${t}/${b}/${c}`;
  const speech = createSpeech();
  const capture = createMediaCapture();
  const friends = signal<Friend[]>([]);
  const media = createMedia();
  const audioPlayback = createAudioPlaybackManager();
  const tabs = signal<{ readingState: object }[]>([reading.peek().tab]);
  /** The narration the Bible API lists for each chapter, by reader. */
  const narration: Record<string, string> = {
    gilbert: "https://audio.example/gilbert/JHN-1.mp3",
  };
  const clipboard: string[] = [];

  const context = {
    tools,
    panes,
    modals,
    discover,
    app: {
      toast: (message: string) => toasts.push(message),
      currentReadingState: reading,
      isMobile: signal(false),
      openVerseReference: async (ref: unknown) => {
        openedReferences.push(ref);
      },
    },
    theme: {
      themeCssVariables: signal("--sb-font-color: #111;"),
      currentTheme: signal({
        highlightColors: { yellow: {}, blue: {} },
      }),
      googleFontFamiliesToLoad: signal<string[]>([]),
    },
    i18n: {
      language: signal("en"),
      isRtl: signal(false),
      t: (key: string, options?: Record<string, unknown>) =>
        options ? `${key} ${JSON.stringify(options)}` : key,
    },
    login: { userId, profile },
    extensionSettings: {
      getValue: () => undefined,
      fetchWithSensitiveValues: async (
        extensionId: string,
        request: unknown
      ) => {
        sensitiveFetches.push({ extensionId, request });
        return sensitive.respond();
      },
    },
    extensions: {
      registerSettingsPanel: (id: string, render: () => unknown) => {
        settingsPanels.set(id, render);
        return () => settingsPanels.delete(id);
      },
    },
    highlights: {
      readChapterHighlights: async (t: string, b: string, c: number) => ({
        highlights: highlights.get(chapterKey(t, b, c)) ?? [],
      }),
      highlightVerses: async (
        t: string,
        b: string,
        c: number,
        verses: number[],
        details: { colorId: string }
      ) => {
        const key = chapterKey(t, b, c);
        const kept = (highlights.get(key) ?? []).filter(
          (h) => typeof h.verse !== "number" || !verses.includes(h.verse)
        );
        highlights.set(key, [
          ...kept,
          ...verses.map((verse) => ({ verse, colorId: details.colorId })),
        ]);
      },
      unhighlightVerses: async (
        t: string,
        b: string,
        c: number,
        verses: number[]
      ) => {
        const key = chapterKey(t, b, c);
        highlights.set(
          key,
          (highlights.get(key) ?? []).filter(
            (h) => typeof h.verse !== "number" || !verses.includes(h.verse)
          )
        );
      },
    },
    annotations: {
      listAnnotationsForChapter: async (b: string, c: number) => [
        ...(notes.get(`${b}/${c}`) ?? []),
      ],
      saveAnnotationAndRefresh: async (annotation: Annotation) => {
        const key = `${annotation.bookId}/${annotation.chapterNumber}`;
        notes.set(key, [
          ...(notes.get(key) ?? []).filter((n) => n.id !== annotation.id),
          annotation,
        ]);
        return annotation;
      },
      deleteAnnotationAndRefresh: async (annotation: Annotation) => {
        const key = `${annotation.bookId}/${annotation.chapterNumber}`;
        notes.set(
          key,
          (notes.get(key) ?? []).filter((n) => n.id !== annotation.id)
        );
      },
    },
    saves: {
      saves,
      addSave: async (
        translationId: string,
        bookId: string,
        chapterNumber: number,
        options?: { verse?: Save["verse"]; categories?: readonly string[] }
      ) => {
        saves.value = [
          ...saves.value,
          {
            id: `save-${saves.value.length + 1}`,
            translationId,
            bookId,
            chapterNumber,
            verse: options?.verse,
            createdAt: 1000,
            categories: [...(options?.categories ?? ["Saved"])],
          },
        ];
      },
      removeSave: async (id: string) => {
        saves.value = saves.value.filter((save) => save.id !== id);
      },
    },
    readingHistory: {
      getReadingEvents: async (start: number, end: number) =>
        readingEvents.filter((e) => e.end >= start && e.start <= end),
    },
    bibleData: {
      getAudioTimings: async () => ({ verses: [0, 30] }),
      getTranslationBookChapter: async (
        _t: string,
        _b: string,
        chapter: number
      ) => ({
        translation: { language: "eng" },
        thisChapterAudioLinks: narration,
        thisChapterAudioTimings: { gilbert: "https://audio.example/t.json" },
        chapter: {
          number: chapter,
          content: [
            { type: "heading", content: ["A heading"] },
            { type: "verse", number: 1, content: ["In the beginning"] },
            { type: "verse", number: 2, content: ["was the Word."] },
          ],
        },
      }),
    },
    chats: {
      chats: signal<{ id: string; isShared?: boolean }[]>([]),
      registerProvider: (provider: ChatProvider) => {
        chatProviders.set(provider.id, provider);
        return () => chatProviders.delete(provider.id);
      },
    },
    friends: { friends },
    textToSpeech: speech.textToSpeech,
    audioPlayback,
    tabs: { tabs },
    mediaCapture: capture.mediaCapture,
  };
  setupExtensionContext(context as unknown as SeedBibleState);
  return {
    surfaces,
    panes,
    modals,
    discover,
    reading,
    selectedVerses,
    toasts,
    openedReferences,
    userId,
    profile,
    publicProfiles,
    highlights,
    notes,
    saves,
    readingEvents,
    chats: context.chats,
    chatProviders,
    settingsPanels,
    sensitiveFetches,
    sensitive,
    speech,
    capture,
    friends,
    clipboard,
    media,
    audioPlayback,
    tabs,
    narration,
  };
}

/**
 * A frame that runs no SDK: the test drives the wire protocol itself, the
 * way a hand-written (or hostile) bundle could.
 */
export function createRawFrame() {
  const messages: SandboxHostMessage[] = [];
  let port: MessagePort | null = null;
  let init: SandboxInit | null = null;
  let nextId = 1;
  const start = (framePort: MessagePort, frameInit: SandboxInit) => {
    port = framePort;
    init = frameInit;
    framePort.onmessage = (event: MessageEvent<SandboxHostMessage>) =>
      messages.push(event.data);
  };
  /** Posts anything at all to the host. */
  const send = (message: unknown) => port!.postMessage(message);
  /** Makes a call and resolves with the host's whole response. */
  const call = async <M extends SandboxMethod>(
    method: M,
    params: SandboxMethods[M]["params"] | Record<string, unknown>
  ) => {
    const id = nextId++;
    send({ type: "call", id, method, params });
    await vi.waitFor(() =>
      expect(messages.some((m) => m.type === "result" && m.id === id)).toBe(
        true
      )
    );
    return messages.find((m) => m.type === "result" && m.id === id)!;
  };
  return {
    start,
    messages,
    send,
    call,
    get init() {
      return init;
    },
    get started() {
      return port !== null;
    },
  };
}

export type RawFrame = ReturnType<typeof createRawFrame>;

export type SandboxTestHost = ReturnType<typeof createHost>;

export interface SandboxHarness {
  frames: SandboxFrameRequest[];
  /** Which frame the user is "in", as the host would see from focus. */
  focusedFrame: SandboxFrameRequest | null;
  consent: Mock<(request: SandboxConsentRequest) => Promise<boolean>>;
  host: SandboxTestHost;
  /** The account's records, where `sb.storage` syncs for a signed-in user. */
  records: ReturnType<typeof createRecords>;
  connector: SandboxFrameConnector;
  /** Stands in for the browser's record of a click or key press just now. */
  setUserActivation: (isActive: boolean) => void;
  createManager: (options?: ExtensionManagerOptions) => ExtensionManager;
  publish: (
    definition: SandboxExtension | RawFrame,
    meta: Partial<ExtensionMeta> & { id: string },
    url?: string
  ) => Promise<UploadedExtension>;
  /** Simulates a page reload: the extension stops, but stays installed and granted. */
  reload: (id: string) => void;
  /** Hosts `extensions` as an `ExtensionSet` at `url`, as a static host would. */
  hostSet: (url: string, extensions: UploadedExtension[]) => void;
  /** Serves `body` as the JSON response at `url`. */
  hostJson: (url: string, body: unknown) => void;
}

/**
 * Sets up a fresh host, manager options and in-memory bundle store before
 * each test, and tears them down after. Read the live values (`frames`,
 * `host`, `consent`) through the returned object.
 */
export function useSandboxHarness(): SandboxHarness {
  // A "bundle" here is a token that names an extension definition (or a raw
  // frame); the in-process connector starts it the way the frame's bootstrap
  // would start the real module.
  const definitions = new Map<string, SandboxExtension | RawFrame>();
  const bundles = new Map<string, string>();
  const sets = new Map<string, unknown>();
  let openPorts: MessagePort[] = [];
  let nextBundle = 0;

  const harness: SandboxHarness = {
    frames: [],
    focusedFrame: null,
    consent: vi.fn(),
    host: null as unknown as SandboxTestHost,
    records: createRecords(),

    connector: (request) => {
      harness.frames.push(request);
      const channel = new MessageChannel();
      openPorts.push(channel.port1, channel.port2);
      const definition = definitions.get(request.code);
      const init = structuredClone(request.init);
      if (definition && "start" in definition) {
        definition.start(channel.port2, init);
      } else if (definition) {
        void definition[SANDBOX_START_KEY](channel.port2, init);
      }
      return {
        port: channel.port1,
        destroy: () => {
          harness.frames = harness.frames.filter((frame) => frame !== request);
          channel.port1.close();
          channel.port2.close();
        },
        hasFocus: () => harness.focusedFrame === request,
      };
    },

    setUserActivation(isActive) {
      Object.defineProperty(navigator, "userActivation", {
        value: { isActive, hasBeenActive: isActive },
        configurable: true,
      });
    },

    createManager(options = {}) {
      return createExtensionManager(createLogin(harness.host), {
        records: harness.records.records,
        sandboxStoragePushDelayMs: 0,
        requestSandboxConsent: harness.consent,
        sandboxFrameConnector: harness.connector,
        ...options,
      });
    },

    async publish(
      definition,
      meta,
      url = `https://files.example.com/publisher-a/${meta.id}-${nextBundle}.js`
    ) {
      const code = `bundle:${nextBundle++}`;
      definitions.set(code, definition);
      bundles.set(url, code);
      return {
        url,
        meta: {
          translations: {
            en: { title: `Title of ${meta.id}`, description: "Does things." },
          },
          integrity: await sha384(code),
          ...meta,
        },
      };
    },

    reload(id) {
      ExtensionInitalizer.getInstance().unregisterExtension(id);
    },

    hostSet(url, extensions) {
      sets.set(url, { id: `set-${url}`, extensions });
    },
    hostJson(url, body) {
      sets.set(url, body);
    },
  };

  beforeEach(() => {
    localStorage.clear();
    harness.frames = [];
    harness.focusedFrame = null;
    openPorts = [];
    nextBundle = 0;
    definitions.clear();
    bundles.clear();
    sets.clear();
    harness.consent = vi.fn(async () => true);
    harness.host = createHost();
    harness.records = createRecords();
    stubMediaPlayback(harness.host.media);
    const clipboard = harness.host.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          clipboard.push(text);
        },
      },
      configurable: true,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (sets.has(url)) {
          return { ok: true, json: async () => structuredClone(sets.get(url)) };
        }
        const code = bundles.get(url);
        return code === undefined
          ? { ok: false, status: 404, statusText: "Not Found" }
          : {
              ok: true,
              arrayBuffer: async () => new TextEncoder().encode(code).buffer,
            };
      })
    );
  });

  afterEach(() => {
    const initializer = ExtensionInitalizer.getInstance();
    for (const registration of initializer.listRegisteredExtensions()) {
      initializer.unregisterExtension(registration.id);
    }
    for (const port of openPorts) {
      port.close();
    }
    harness.setUserActivation(false);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  return harness;
}
