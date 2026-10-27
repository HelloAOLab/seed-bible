/**
 * `seed-bible/extensions/testing`: runs a sandboxed extension in a unit test,
 * against a stand-in for Seed Bible, in the test's own process (jsdom).
 *
 * The extension's code runs exactly as it does in the app: through the same
 * SDK, over a `MessageChannel`, with every call checked against the
 * permissions the test grants. What the stand-in answers is simple and
 * in-memory (a toast is recorded, storage is a `Map`), and anything it
 * doesn't simulate can be answered with `answers`.
 *
 * ```tsx
 * import extension from "../src/main";
 * import { createTestHost } from "seed-bible/extensions/testing";
 *
 * it("shows a toast from its toolbar button", async () => {
 *   const host = await createTestHost(extension);
 *   await host.selectTool("hello");
 *   expect(host.toasts).toEqual(["Hello!"]);
 * });
 * ```
 */
import {
  expandSandboxPermissions,
  SANDBOX_METHOD_PERMISSIONS,
  SANDBOX_PROTOCOL_VERSION,
  SANDBOX_START_KEY,
  type SandboxChatRequest,
  type SandboxDiscoverRequest,
  type SandboxDiscoverResult,
  type SandboxErrorCode,
  type SandboxFrameMode,
  type SandboxHostEvent,
  type SandboxHostRequestKind,
  type SandboxHostRequests,
  type SandboxInit,
  type SandboxJsonValue,
  type SandboxMethod,
  type SandboxMethods,
  type SandboxPaneOptions,
  type SandboxPermission,
  type SandboxPortalOptions,
  type SandboxRequest,
  type SandboxResponse,
  type SandboxSelectedVerse,
  type SandboxState,
  type SandboxToolDefinition,
  type SandboxVerseRef,
} from "./protocol";
import type { SandboxExtension } from "./index";

/** Answers one call the stand-in doesn't simulate (or replaces its answer). */
export type TestAnswer<M extends SandboxMethod> = (
  params: SandboxMethods[M]["params"]
) => SandboxMethods[M]["result"] | Promise<SandboxMethods[M]["result"]>;

export interface TestHostOptions {
  /** Granted from the start, as if required by the manifest or allowed earlier. */
  granted?: SandboxPermission[];
  /** What the manifest lists under `optionalPermissions`. */
  optional?: SandboxPermission[];
  /**
   * How the user answers `sb.permissions.request`. Defaults to agreeing.
   * Only `optional` permissions can be requested, as in the app.
   */
  allowRequests?: boolean;
  /** The app state frames start with; the rest has sensible defaults. */
  state?: Partial<SandboxState>;
  /** The extension's own settings, for `sb.settings.get`. */
  settings?: Record<string, string | number | boolean>;
  /**
   * Answers for calls the stand-in doesn't simulate (Bible text, user data,
   * audio, devices, modals, sensitive requests), or replacements for ones it
   * does, keyed by method: the `sb` path without `sb.`, so `sb.notes.create`
   * is `"notes.create"`. Both `sb.modals` calls are `"modals.open"`. Without
   * an answer, an unsimulated call rejects with a message naming it.
   *
   * @example
   * answers: {
   *   "bible.chapter": () => ({ verses: [{ number: 1, text: "In the beginning…" }] }),
   * }
   */
  answers?: { [M in SandboxMethod]?: TestAnswer<M> };
  /** The extension's id. Defaults to `"test-extension"`. */
  extensionId?: string;
}

/** A call the extension made, after the permission check. */
export interface TestCall {
  method: SandboxMethod;
  params: unknown;
}

export interface TestPane {
  paneId: string;
  /** The `view` it shows; null for a CasualOS portal. */
  view: string | null;
  options: SandboxPaneOptions | SandboxPortalOptions;
}

export interface TestHost {
  /** Settles once `main` has finished, or rejects with its error. */
  ready: Promise<void>;
  /** Registered tools, by the id the extension gave them. */
  tools: Map<string, SandboxToolDefinition>;
  /** Open panes and portals, by pane id. */
  panes: Map<string, TestPane>;
  /** Every `sb.app.toast` message, in order. */
  toasts: string[];
  /** Every `sb.reading.open`. */
  opened: SandboxVerseRef[];
  /** The extension's `sb.storage`. Set entries on it to seed storage. */
  storage: Map<string, SandboxJsonValue>;
  /** What `sb.clipboard.writeText` copied. */
  clipboard: string[];
  /** Every call that got past the permission check, in order. */
  calls: TestCall[];
  /**
   * The permission prompts the user would have seen, and their answers. A
   * request for what's already granted is answered without one, as in the
   * app.
   */
  requests: { permissions: SandboxPermission[]; granted: boolean }[];
  /** Registered Discover and chat providers, by id. */
  discoverProviders: Set<string>;
  chatProviders: Set<string>;
  /** What's granted now, implied permissions included. */
  granted: () => SandboxPermission[];
  /** The user selects a tool (or one of its `items`). Waits for its handler. */
  selectTool: (
    id: string,
    options?: { itemId?: string; selection?: SandboxSelectedVerse[] }
  ) => Promise<void>;
  /** The app's state changes, e.g. the reader moves to another chapter. */
  setState: (state: Partial<SandboxState>) => Promise<void>;
  /** Asks a Discover provider for results, as the Discover panel does. */
  discover: (
    providerId: string,
    request: Omit<SandboxDiscoverRequest, "providerId">
  ) => Promise<SandboxDiscoverResult[]>;
  /** Asks a chat provider for its reply. */
  chat: (
    providerId: string,
    request: Omit<SandboxChatRequest, "providerId">
  ) => Promise<string | null>;
  /**
   * Renders a view into `container` (or a new element in `document.body`)
   * with its own `sb`, as a pane would. Returns the element it rendered in.
   */
  renderView: (
    view: string,
    options?: {
      props?: SandboxJsonValue;
      paneId?: string;
      surface?: "pane" | "modal" | "settings";
      container?: HTMLElement;
    }
  ) => Promise<HTMLElement>;
  /** Waits until every message already sent between the two sides has arrived. */
  flush: () => Promise<void>;
  /** Closes every channel. Call it at the end of each test. */
  dispose: () => void;
}

const DEFAULT_STATE: SandboxState = {
  themeCss: "",
  language: "en",
  direction: "ltr",
  strings: {},
  isMobile: false,
  position: null,
  selection: [],
  identity: null,
  fontStylesheets: [],
  session: null,
  playback: null,
};

class TestHostError extends Error {
  constructor(
    readonly code: SandboxErrorCode,
    message: string
  ) {
    super(message);
  }
}

/** Lets queued messages and the work they start run. */
const settle = async () => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

/**
 * Starts `extension`'s `main` against a stand-in for Seed Bible, and
 * resolves once it's running (`main` may still be running; await
 * `host.ready` for it to finish).
 */
export async function createTestHost(
  extension: SandboxExtension,
  options: TestHostOptions = {}
): Promise<TestHost> {
  const extensionId = options.extensionId ?? "test-extension";
  const optional = options.optional ?? [];
  let granted = expandSandboxPermissions(options.granted ?? []);
  let state: SandboxState = { ...DEFAULT_STATE, ...options.state };
  const ports: MessagePort[] = [];
  const frames = new Set<MessagePort>();
  let background: MessagePort | null = null;
  let nextHostRequest = 1;
  const pendingHostRequests = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  const toolWaits: Promise<unknown>[] = [];

  let resolveReady!: () => void;
  let rejectReady!: (error: Error) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  ready.catch(() => {});

  const post = (
    port: MessagePort,
    message: SandboxHostEvent | SandboxResponse
  ) => port.postMessage(message);
  const broadcast = (message: SandboxHostEvent) => {
    for (const port of frames) {
      post(port, message);
    }
  };

  const host: TestHost = {
    ready,
    tools: new Map(),
    panes: new Map(),
    toasts: [],
    opened: [],
    storage: new Map(),
    clipboard: [],
    calls: [],
    requests: [],
    discoverProviders: new Set(),
    chatProviders: new Set(),
    granted: () => [...granted],
    selectTool: async (id, select = {}) => {
      if (!host.tools.has(id)) {
        throw new Error(`No tool '${id}' is registered.`);
      }
      post(background!, {
        type: "event",
        name: "tool.select",
        toolId: id,
        itemId: select.itemId ?? null,
        selection: granted.includes("reading:selection")
          ? (select.selection ?? state.selection)
          : [],
      });
      await settle();
      await Promise.all(toolWaits.splice(0));
      await settle();
    },
    setState: async (next) => {
      state = { ...state, ...next };
      broadcast({ type: "state", state: next });
      await settle();
    },
    discover: async (providerId, request) =>
      (await askBackground("discover", {
        providerId,
        ...request,
      })) as SandboxDiscoverResult[],
    chat: async (providerId, request) =>
      (await askBackground("chat", { providerId, ...request })) as
        | string
        | null,
    renderView: async (view, render = {}) => {
      const container =
        render.container ??
        document.body.appendChild(document.createElement("div"));
      // The SDK renders a view into `#root`, as in its frame.
      const previous = document.getElementById("root");
      previous?.removeAttribute("id");
      container.id = "root";
      try {
        await connect({
          kind: "view",
          view,
          surface: render.surface ?? "pane",
          paneId: render.paneId ?? `${extensionId}:test-pane`,
          props: render.props ?? null,
        });
      } finally {
        container.removeAttribute("id");
        previous?.setAttribute("id", "root");
      }
      await settle();
      return container;
    },
    flush: settle,
    dispose: () => {
      for (const port of ports) {
        port.close();
      }
    },
  };

  function askBackground<K extends SandboxHostRequestKind>(
    kind: K,
    payload: SandboxHostRequests[K]["payload"]
  ): Promise<unknown> {
    const requestId = nextHostRequest++;
    return new Promise((resolve, reject) => {
      pendingHostRequests.set(requestId, { resolve, reject });
      post(background!, {
        type: "event",
        name: "request",
        requestId,
        kind,
        payload,
      });
    });
  }

  const answer = async (
    method: SandboxMethod,
    params: unknown,
    isBackground: boolean
  ): Promise<unknown> => {
    const required = SANDBOX_METHOD_PERMISSIONS[method];
    if (required && !granted.includes(required)) {
      throw new TestHostError(
        "permission_denied",
        `'${method}' needs the '${required}' permission, which this extension wasn't granted.`
      );
    }
    if (method !== "pong" && method !== "respond" && method !== "ready") {
      host.calls.push({ method, params });
    }
    const custom = options.answers?.[method] as
      | ((params: unknown) => unknown)
      | undefined;
    if (custom) {
      return custom(params);
    }
    const p = params as Record<string, unknown>;
    switch (method) {
      case "tools.register": {
        const definition = params as SandboxToolDefinition;
        host.tools.set(definition.id, definition);
        return null;
      }
      case "tools.update": {
        const { id, patch } =
          params as SandboxMethods["tools.update"]["params"];
        const existing = host.tools.get(id);
        if (!existing) {
          throw new TestHostError(
            "not_found",
            `No tool '${id}' is registered.`
          );
        }
        host.tools.set(id, { ...existing, ...patch });
        return null;
      }
      case "tools.unregister":
        host.tools.delete(p.id as string);
        return null;
      case "panes.open":
      case "portals.open": {
        const paneOptions = params as SandboxPaneOptions | SandboxPortalOptions;
        const paneId = `sandbox:${extensionId}:${paneOptions.id ?? `pane-${host.panes.size + 1}`}`;
        host.panes.set(paneId, {
          paneId,
          view: "view" in paneOptions ? paneOptions.view : null,
          options: paneOptions,
        });
        return { paneId };
      }
      case "panes.close": {
        const paneId = p.paneId as string;
        if (!host.panes.delete(paneId)) {
          throw new TestHostError("not_found", `No open pane '${paneId}'.`);
        }
        broadcast({ type: "event", name: "pane.closed", paneId });
        return null;
      }
      case "app.toast":
        host.toasts.push(p.message as string);
        return null;
      case "reading.open":
        host.opened.push(params as SandboxVerseRef);
        return null;
      case "storage.get":
        return host.storage.get(p.key as string) ?? null;
      case "storage.set":
        host.storage.set(p.key as string, p.value as SandboxJsonValue);
        return null;
      case "storage.remove":
        host.storage.delete(p.key as string);
        return null;
      case "storage.keys":
        return [...host.storage.keys()];
      case "settings.get":
        return options.settings?.[p.key as string] ?? null;
      case "clipboard.writeText":
        host.clipboard.push(p.text as string);
        return null;
      case "discover.register":
      case "chats.register":
      case "discover.unregister":
      case "chats.unregister": {
        if (!isBackground) {
          throw new TestHostError(
            "invalid_request",
            `'${method}' can only be called from the extension's main code.`
          );
        }
        const providers = method.startsWith("discover")
          ? host.discoverProviders
          : host.chatProviders;
        if (method.endsWith(".register")) {
          providers.add(p.id as string);
        } else {
          providers.delete(p.id as string);
        }
        return null;
      }
      case "permissions.request": {
        const asked = p.permissions as SandboxPermission[];
        const undeclared = asked.filter(
          (permission) =>
            !optional.includes(permission) && !granted.includes(permission)
        );
        if (undeclared.length > 0) {
          throw new TestHostError(
            "invalid_request",
            `Only permissions listed under "optionalPermissions" can be requested; not: ${undeclared.join(", ")}.`
          );
        }
        if (asked.every((permission) => granted.includes(permission))) {
          return { granted: true };
        }
        const agreed = options.allowRequests ?? true;
        if (agreed) {
          granted = expandSandboxPermissions([...granted, ...asked]);
          broadcast({ type: "permissions", granted: [...granted] });
        }
        host.requests.push({ permissions: asked, granted: agreed });
        return { granted: agreed };
      }
      case "respond": {
        const { requestId, value, error } =
          params as SandboxMethods["respond"]["params"];
        const pending = pendingHostRequests.get(requestId);
        pendingHostRequests.delete(requestId);
        if (error !== undefined) {
          pending?.reject(new Error(error));
        } else {
          pending?.resolve(value);
        }
        return null;
      }
      case "pong":
        return null;
      case "ready": {
        const error = p.error as string | undefined;
        if (error) {
          rejectReady(new Error(error));
        } else {
          resolveReady();
        }
        return null;
      }
      default:
        throw new TestHostError(
          "unavailable",
          `The test host doesn't simulate '${method}'. Pass an answer for it in createTestHost's \`answers\` option.`
        );
    }
  };

  const connect = async (mode: SandboxFrameMode) => {
    const channel = new MessageChannel();
    ports.push(channel.port1, channel.port2);
    const port = channel.port1;
    const isBackground = mode.kind === "background";
    frames.add(port);
    if (isBackground) {
      background = port;
    }
    port.onmessage = (event: MessageEvent<SandboxRequest>) => {
      const { id, method, params } = event.data;
      const reply = answer(method, params, isBackground).then(
        (value): SandboxResponse => ({ type: "result", id, ok: true, value }),
        (err: unknown): SandboxResponse => ({
          type: "result",
          id,
          ok: false,
          error:
            err instanceof TestHostError
              ? { code: err.code, message: err.message }
              : { code: "internal", message: String(err) },
        })
      );
      // A tool's handler may make calls; `selectTool` waits for them.
      toolWaits.push(reply);
      void reply.then((response) => {
        if (id !== 0) {
          post(port, response);
        }
      });
    };
    const init: SandboxInit = {
      protocol: SANDBOX_PROTOCOL_VERSION,
      extensionId,
      mode,
      granted: [...granted],
      optional: [...optional],
      state,
    };
    await extension[SANDBOX_START_KEY](channel.port2, init);
  };

  void connect({ kind: "background" }).catch((err: unknown) =>
    rejectReady(err instanceof Error ? err : new Error(String(err)))
  );
  await settle();
  return host;
}
