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
import { createPanes } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import type {
  BibleTool,
  ToolsManager,
} from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import type { BibleSelectedVerse } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
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

function createLogin(): LoginManager {
  return {
    userId: signal<string | null>(null),
    profile: signal(null),
    localConfig: signal<Record<string, unknown>>({}),
    profilePromise: null,
  } as unknown as LoginManager;
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
  const selectedVerses = signal<BibleSelectedVerse[]>([]);
  const reading = signal({
    tab: { readingState: { selectedVerses } },
    translationId: "BSB" as string | null,
    bookId: "JHN" as string | null,
    chapterNumber: 3 as number | null,
  });
  const toasts: string[] = [];
  const openedReferences: unknown[] = [];
  const context = {
    tools,
    panes,
    app: {
      toast: (message: string) => toasts.push(message),
      currentReadingState: reading,
      isMobile: signal(false),
      openVerseReference: async (ref: unknown) => {
        openedReferences.push(ref);
      },
    },
    theme: { themeCssVariables: signal("--sb-font-color: #111;") },
    i18n: { language: signal("en"), isRtl: signal(false) },
    extensionSettings: { getValue: () => undefined },
  };
  setupExtensionContext(context as unknown as SeedBibleState);
  return { surfaces, panes, reading, selectedVerses, toasts, openedReferences };
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
  let openPorts: MessagePort[] = [];
  let nextBundle = 0;

  const harness: SandboxHarness = {
    frames: [],
    focusedFrame: null,
    consent: vi.fn(),
    host: null as unknown as SandboxTestHost,

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
      return createExtensionManager(createLogin(), {
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
  };

  beforeEach(() => {
    localStorage.clear();
    harness.frames = [];
    harness.focusedFrame = null;
    openPorts = [];
    nextBundle = 0;
    definitions.clear();
    bundles.clear();
    harness.consent = vi.fn(async () => true);
    harness.host = createHost();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
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
