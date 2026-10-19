import * as z from "zod/v4";
import { effect, signal, type ReadonlySignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { v4 as uuid } from "uuid";
import { MaterialIcon } from "../components/icons";
import { safeLocalStorage } from "../app/ssrEnv";
import { translateTitle } from "../app/utils";
import { useI18n } from "../i18n";
import type { AppState } from "./SeedBibleStateManager";
import type {
  BibleBelowReaderToolContext,
  BibleTool,
  BibleToolContext,
  ManagedBibleToolItem,
  QuickToolContext,
  TranslatableTitle,
  ToolsManager,
} from "./BibleToolsManager";
import type { PanesManager } from "./PanesManager";
import type { ExtensionSettingsManager } from "./ExtensionSettingsManager";
import type { I18nManager } from "../i18n/I18nManager";
import type { BookId } from "./BibleDataManager";
import {
  SANDBOX_PERMISSIONS,
  SANDBOX_PROTOCOL_VERSION,
  type SandboxErrorCode,
  type SandboxFrameMode,
  type SandboxHostEvent,
  type SandboxIcon,
  type SandboxInit,
  type SandboxJsonValue,
  type SandboxMethod,
  type SandboxMethods,
  type SandboxPermission,
  type SandboxReadingPosition,
  type SandboxResponse,
  type SandboxSelectedVerse,
  type SandboxState,
  type SandboxTitle,
  type SandboxToolDefinition,
} from "../extensions/protocol";

/**
 * What a sandbox session needs from the app. `SeedBibleState` satisfies it;
 * spelling it out keeps the broker's reach visible in one place: nothing
 * outside this list is reachable from a sandboxed extension.
 */
export interface SandboxHostContext {
  tools: Pick<
    ToolsManager,
    | "registerToolbarTool"
    | "unregisterToolbarTool"
    | "registerVerseToolbarTool"
    | "unregisterVerseToolbarTool"
    | "registerQuickTool"
    | "unregisterQuickTool"
    | "registerBelowReaderTool"
    | "unregisterBelowReaderTool"
  >;
  panes: Pick<PanesManager, "openPane" | "closePane">;
  app: Pick<
    AppState,
    "toast" | "currentReadingState" | "isMobile" | "openVerseReference"
  >;
  theme: { themeCssVariables: ReadonlySignal<string> };
  i18n: Pick<I18nManager, "language" | "isRtl">;
  extensionSettings: Pick<ExtensionSettingsManager, "getValue">;
}

export interface SandboxFrameRequest {
  extensionId: string;
  /** The extension's bundle, already checked against its pinned hash. */
  code: string;
  init: SandboxInit;
  /** The hosts the frame's CSP lets it contact. */
  network: string[];
  /** Where to put the frame; null for the hidden background frame. */
  container: HTMLElement | null;
  /** The iframe's accessible title. */
  title: string;
}

export interface SandboxFrameConnection {
  /** The host's end of the frame's channel. */
  port: MessagePort;
  destroy: () => void;
  /** Whether the user is in this frame right now (it has focus). */
  hasFocus?: () => boolean;
}

/**
 * Creates one frame and connects it. The default is `iframeFrameConnector`;
 * tests pass one that runs the SDK in-process over a `MessageChannel`, which
 * jsdom's iframes can't do.
 */
export type SandboxFrameConnector = (
  request: SandboxFrameRequest
) => SandboxFrameConnection;

/**
 * Builds the frame's Content Security Policy. Scripts may be inline or from
 * `blob:` because that is how the bootstrap loads the bundle; that grants
 * nothing, since the extension's own code already runs there. What the
 * policy actually limits is where the frame can send requests or load
 * anything from: only `network`.
 */
export function buildSandboxCsp(network: string[]): string {
  const hosts = network.map((host) => `https://${host}`).join(" ");
  const remote = hosts ? ` ${hosts}` : "";
  return [
    "default-src 'none'",
    "script-src 'unsafe-inline' blob:",
    "style-src 'unsafe-inline'",
    `img-src data: blob:${remote}`,
    `media-src data: blob:${remote}`,
    `font-src data:${remote}`,
    `connect-src ${hosts || "'none'"}`,
    "frame-src 'none'",
    "worker-src blob:",
    "form-action 'none'",
    "base-uri 'none'",
  ].join("; ");
}

/**
 * Runs in the frame before anything else. It accepts exactly one message,
 * from the host page itself (`event.source === parent`; a sibling frame can
 * post to this one too), then imports the bundle from a `blob:` URL and hands
 * it the port.
 */
const SANDBOX_BOOTSTRAP = `(() => {
  const onMessage = async (event) => {
    if (event.source !== parent || !event.ports || !event.ports[0]) return;
    removeEventListener("message", onMessage);
    const port = event.ports[0];
    try {
      const url = URL.createObjectURL(new Blob([event.data.code], { type: "text/javascript" }));
      const mod = await import(url);
      const start = mod.default && mod.default.__seedBibleSandboxStart;
      if (typeof start !== "function") {
        throw new Error("The extension's default export is not the result of defineExtension() from seed-bible/extensions.");
      }
      await start(port, event.data.init);
    } catch (err) {
      port.postMessage({ type: "call", id: 0, method: "ready", params: { error: String(err) } });
    }
  };
  addEventListener("message", onMessage);
})();`;

export function buildSandboxDocument(network: string[]): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${buildSandboxCsp(network)}"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script>${SANDBOX_BOOTSTRAP}</script></body></html>`;
}

let backgroundContainer: HTMLElement | null = null;

const getBackgroundContainer = () => {
  if (!backgroundContainer || !backgroundContainer.isConnected) {
    backgroundContainer = document.createElement("div");
    backgroundContainer.id = "sb-sandbox-background-frames";
    backgroundContainer.hidden = true;
    document.body.appendChild(backgroundContainer);
  }
  return backgroundContainer;
};

/**
 * `sandbox="allow-scripts"` without `allow-same-origin` gives each frame its
 * own opaque origin: no access to the app's storage (where the session key
 * lives), DOM, or cookies, and none to other extensions' frames. Popups, top
 * navigation, forms and modals stay blocked because those flags aren't set.
 */
export const iframeFrameConnector: SandboxFrameConnector = (request) => {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.setAttribute("referrerpolicy", "no-referrer");
  iframe.title = request.title;
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.srcdoc = buildSandboxDocument(request.network);

  const channel = new MessageChannel();
  // `once`: if the extension reloads its own frame, it doesn't get the code
  // and a port a second time; it just stops working.
  iframe.addEventListener(
    "load",
    () => {
      iframe.contentWindow?.postMessage(
        { code: request.code, init: request.init },
        "*",
        [channel.port2]
      );
    },
    { once: true }
  );
  (request.container ?? getBackgroundContainer()).appendChild(iframe);

  return {
    port: channel.port1,
    destroy: () => {
      channel.port1.close();
      iframe.remove();
    },
    // A click inside a frame focuses its <iframe> in the host document, which
    // the frame itself can't fake.
    hasFocus: () => document.activeElement === iframe,
  };
};

const DIGEST_ALGORITHMS: Record<string, string> = {
  sha256: "SHA-256",
  sha384: "SHA-384",
  sha512: "SHA-512",
};

/**
 * Downloads a sandboxed extension's bundle and checks it against the
 * `integrity` hash its manifest pins, so the code that runs is exactly the
 * code the user agreed to, even if the file at `url` is later replaced.
 * Rejects on a network error, a mismatch, or a bundle that isn't UTF-8.
 */
export async function fetchSandboxBundle(
  url: string,
  integrity: string
): Promise<string> {
  const response = await fetch(url, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) {
    throw new Error(
      `Couldn't download the bundle: ${response.status} ${response.statusText}`
    );
  }
  const bytes = await response.arrayBuffer();
  const separator = integrity.indexOf("-");
  const algorithm = DIGEST_ALGORITHMS[integrity.slice(0, separator)];
  if (!algorithm) {
    throw new Error(`Unsupported integrity hash '${integrity}'.`);
  }
  const digest = new Uint8Array(await crypto.subtle.digest(algorithm, bytes));
  const actual = btoa(String.fromCharCode(...digest));
  if (actual !== integrity.slice(separator + 1)) {
    throw new Error(
      "The bundle doesn't match the integrity hash in its manifest."
    );
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

const MAX_TOOLS = 20;
const MAX_OPEN_PANES = 5;
const MAX_STORAGE_BYTES = 256 * 1024;
const MAX_PROPS_BYTES = 64 * 1024;
const TOOL_PRIORITY_MIN = 200;
const TOOL_PRIORITY_MAX = 999;

const idSchema = z.string().regex(/^[A-Za-z0-9_.-]{1,64}$/);
const titleSchema = z.union([
  z.string().min(1).max(120),
  z.object({
    key: z.string().min(1).max(200),
    defaultValue: z.string().max(120),
  }),
]);
const iconSchema = z.union([
  z.object({
    svg: z
      .string()
      .max(16 * 1024)
      .refine((svg) => /^\s*<svg[\s>]/i.test(svg), "must be an <svg> element"),
  }),
  z.object({ material: z.string().regex(/^[a-z0-9_]{1,64}$/) }),
]);
const toolItemSchema = z.object({
  id: idSchema,
  title: titleSchema,
  icon: iconSchema.optional(),
  disabled: z.boolean().optional(),
});
const toolFieldsSchema = z.object({
  title: titleSchema,
  icon: iconSchema,
  priority: z.number().finite().optional(),
  visible: z.boolean().optional(),
  disabled: z.boolean().optional(),
  items: z.array(toolItemSchema).max(20).optional(),
});
const jsonSizeSchema = (maxBytes: number) =>
  z.unknown().refine((value) => {
    try {
      const json = JSON.stringify(value);
      return json !== undefined && json.length <= maxBytes;
    } catch {
      return false;
    }
  }, `must be JSON no larger than ${maxBytes} bytes`);

const paramSchemas: { [M in SandboxMethod]: z.ZodType } = {
  "tools.register": toolFieldsSchema.extend({
    id: idSchema,
    surface: z.enum(["toolbar", "verse", "quick", "belowReader"]),
  }),
  "tools.update": z.object({
    id: idSchema,
    patch: toolFieldsSchema.partial(),
  }),
  "tools.unregister": z.object({ id: idSchema }),
  "panes.open": z.object({
    view: z.string().min(1).max(64),
    placement: z.enum(["side", "floating", "fullscreen"]),
    title: titleSchema,
    props: jsonSizeSchema(MAX_PROPS_BYTES).optional(),
    id: idSchema.optional(),
    width: z.number().min(120).max(4000).optional(),
    height: z.number().min(80).max(4000).optional(),
  }),
  "panes.close": z.object({ paneId: z.string().max(200) }),
  "app.toast": z.object({ message: z.string().min(1).max(300) }),
  "reading.open": z.object({
    bookId: z.string().regex(/^[A-Z0-9]{3}$/),
    chapter: z.number().int().min(1).max(200),
    verse: z.number().int().min(1).max(200).optional(),
  }),
  "storage.get": z.object({ key: z.string().min(1).max(200) }),
  "storage.set": z.object({
    key: z.string().min(1).max(200),
    value: jsonSizeSchema(MAX_STORAGE_BYTES),
  }),
  "storage.remove": z.object({ key: z.string().min(1).max(200) }),
  "storage.keys": z.object({}),
  "settings.get": z.object({ key: z.string().min(1).max(200) }),
  "permissions.request": z.object({
    permissions: z.array(z.enum(SANDBOX_PERMISSIONS)).min(1).max(20),
  }),
  ready: z.object({ error: z.string().max(2000).optional() }),
};

const requestSchema = z.object({
  type: z.literal("call"),
  id: z.number().int(),
  method: z.enum(Object.keys(paramSchemas) as [SandboxMethod]),
  params: z.unknown(),
});

/** Calls only an extension's background frame may make. */
const BACKGROUND_ONLY_METHODS = new Set<SandboxMethod>([
  "tools.register",
  "tools.update",
  "tools.unregister",
  "ready",
]);

const REQUIRED_PERMISSION: Partial<Record<SandboxMethod, SandboxPermission>> = {
  "reading.open": "reading:navigate",
};

class BrokerError extends Error {
  constructor(
    readonly code: SandboxErrorCode,
    message: string
  ) {
    super(message);
  }
}

const sandboxStorageKey = (extensionId: string) =>
  `sb-sandbox-storage:${extensionId}`;

function readSandboxStorage(
  extensionId: string
): Record<string, SandboxJsonValue> {
  try {
    const raw = safeLocalStorage.getItem(sandboxStorageKey(extensionId));
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, SandboxJsonValue>)
      : {};
  } catch {
    return {};
  }
}

/** Forgets everything a sandboxed extension kept with `sb.storage`. */
export function clearSandboxStorage(extensionId: string) {
  safeLocalStorage.removeItem(sandboxStorageKey(extensionId));
}

function SandboxToolIcon({ icon }: { icon: SandboxIcon }) {
  if ("material" in icon) {
    return <MaterialIcon>{icon.material}</MaterialIcon>;
  }
  return (
    <img
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(icon.svg)}`}
      alt=""
      width={24}
      height={24}
    />
  );
}

const EmptyIcon = () => <span aria-hidden="true" />;

export interface SandboxSessionOptions {
  extensionId: string;
  /** The extension's display name, used to label everything it shows. */
  title: string;
  translations: Record<string, Record<string, string>>;
  granted: SandboxPermission[];
  /** What the extension may ask for later with `sb.permissions.request`. */
  optional?: SandboxPermission[];
  /**
   * Asks the user for more of `optional`, and saves their answer. Resolves
   * true only if they agreed. Without it, every request is declined.
   */
  requestPermissions?: (permissions: SandboxPermission[]) => Promise<boolean>;
  network: string[];
  code: string;
  context: SandboxHostContext;
  connector?: SandboxFrameConnector;
}

/** How long after selecting one of its tools an extension may ask for permissions. */
const TOOL_INTERACTION_WINDOW_MS = 5000;

/** The browser's own record of whether the user just clicked or typed in the page. */
const hasTransientUserActivation = () =>
  typeof navigator !== "undefined" &&
  Boolean(
    (navigator as { userActivation?: { isActive: boolean } }).userActivation
      ?.isActive
  );

export interface SandboxSession {
  /** Settles when the extension's `main` has finished, or rejects with its error. */
  ready: Promise<void>;
  /** Removes everything the extension registered and tears down its frames. */
  destroy: () => void;
}

/**
 * Starts one installed sandboxed extension: its hidden background frame,
 * and the broker that answers every frame it opens. The broker is the
 * security boundary — each call is validated, checked against `granted`,
 * and can only touch what this extension itself registered or opened.
 */
export function startSandboxSession(
  options: SandboxSessionOptions
): SandboxSession {
  const {
    extensionId,
    title: extensionTitle,
    translations,
    granted,
    network,
    code,
    context,
  } = options;
  const connector = options.connector ?? iframeFrameConnector;
  const optional = options.optional ?? [];
  // A signal, so the state pushed to the frames follows an optional grant.
  const grantedPermissions = signal<readonly SandboxPermission[]>(granted);
  const has = (permission: SandboxPermission) =>
    grantedPermissions.value.includes(permission);
  // Optional permissions the user said no to since the page loaded, so an
  // extension can't keep asking.
  const declined = new Set<SandboxPermission>();
  let permissionRequestOpen = false;
  let lastToolSelectAt = -Infinity;

  const connections = new Set<SandboxFrameConnection>();
  let background: SandboxFrameConnection | null = null;
  const tools = new Map<string, SandboxToolDefinition>();
  const openPanes = new Set<string>();
  let destroyed = false;

  let resolveReady!: () => void;
  let rejectReady!: (error: Error) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  // Callers that don't await `ready` shouldn't see an unhandled rejection.
  ready.catch(() => {});
  let readySettled = false;

  const scopedId = (id: string) => `sandbox:${extensionId}:${id}`;

  const toTitle = (title: SandboxTitle): TranslatableTitle =>
    typeof title === "string" ? title : { ...title, ns: extensionId };

  const currentPosition = (): SandboxReadingPosition | null => {
    const reading = context.app.currentReadingState.value;
    return reading
      ? {
          translationId: reading.translationId,
          bookId: reading.bookId,
          chapterNumber: reading.chapterNumber,
        }
      : null;
  };

  const currentSelection = (): SandboxSelectedVerse[] =>
    (
      context.app.currentReadingState.value?.tab.readingState.selectedVerses
        .value ?? []
    ).map((selected) => ({
      translationId: selected.translationId,
      bookId: selected.bookId,
      chapterNumber: selected.chapterNumber,
      verse: selected.verse.number,
    }));

  const computeState = (): SandboxState => {
    const language = context.i18n.language.value;
    return {
      themeCss: context.theme.themeCssVariables.value,
      language,
      direction: context.i18n.isRtl.value ? "rtl" : "ltr",
      strings: { ...translations.en, ...translations[language] },
      isMobile: context.app.isMobile.value,
      // Not even read without the permission, so the frame isn't told when
      // they change either.
      position: has("reading:position") ? currentPosition() : null,
      selection: has("reading:selection") ? currentSelection() : [],
    };
  };

  const post = (
    connection: SandboxFrameConnection,
    message: SandboxHostEvent | SandboxResponse
  ) => {
    try {
      connection.port.postMessage(message);
    } catch (err) {
      console.error(`Failed to message extension '${extensionId}':`, err);
    }
  };

  const broadcast = (message: SandboxHostEvent) => {
    for (const connection of connections) {
      post(connection, message);
    }
  };

  const sendToolSelect = (toolId: string, itemId: string | null) => {
    if (!background) {
      return;
    }
    lastToolSelectAt = Date.now();
    post(background, {
      type: "event",
      name: "tool.select",
      toolId,
      itemId,
      selection: has("reading:selection") ? currentSelection() : [],
    });
  };

  const unregisterHostTool = (definition: SandboxToolDefinition) => {
    const id = scopedId(definition.id);
    switch (definition.surface) {
      case "toolbar":
        context.tools.unregisterToolbarTool(id);
        break;
      case "verse":
        context.tools.unregisterVerseToolbarTool(id);
        break;
      case "quick":
        context.tools.unregisterQuickTool(id);
        break;
      case "belowReader":
        context.tools.unregisterBelowReaderTool(id);
        break;
    }
  };

  /**
   * Registers (or replaces) the host's copy of a tool. Ids are scoped to
   * this extension, so it can never replace one of the app's own tools or
   * another extension's.
   */
  const registerHostTool = (definition: SandboxToolDefinition) => {
    const id = scopedId(definition.id);
    const items = definition.items;
    // None of these handlers read the surface-specific context the host
    // passes them, so the same shape serves every surface.
    const build = <TContext,>(): BibleTool<TContext> & {
      isVisible: () => boolean;
      isDisabled: () => boolean;
      onSelect?: () => void;
      getItems?: () => ManagedBibleToolItem<TContext>[];
    } => ({
      id,
      priority: Math.min(
        TOOL_PRIORITY_MAX,
        Math.max(TOOL_PRIORITY_MIN, definition.priority ?? 500)
      ),
      title: toTitle(definition.title),
      icon: () => <SandboxToolIcon icon={definition.icon} />,
      isVisible: () => definition.visible ?? true,
      isDisabled: () => definition.disabled ?? false,
      ...(items
        ? {
            getItems: () =>
              items.map((item) => ({
                id: `${id}:${item.id}`,
                title: toTitle(item.title),
                icon: item.icon
                  ? () => <SandboxToolIcon icon={item.icon!} />
                  : EmptyIcon,
                isDisabled: () => item.disabled ?? false,
                onSelect: () => sendToolSelect(definition.id, item.id),
              })),
          }
        : { onSelect: () => sendToolSelect(definition.id, null) }),
    });
    switch (definition.surface) {
      case "toolbar":
        context.tools.registerToolbarTool(build<BibleToolContext>());
        break;
      case "verse":
        context.tools.registerVerseToolbarTool(build<BibleToolContext>());
        break;
      case "quick":
        context.tools.registerQuickTool(build<QuickToolContext>());
        break;
      case "belowReader":
        context.tools.registerBelowReaderTool(
          build<BibleBelowReaderToolContext>()
        );
        break;
    }
  };

  const storageGetAll = () => readSandboxStorage(extensionId);
  const storageWrite = (data: Record<string, SandboxJsonValue>) => {
    const json = JSON.stringify(data);
    if (json.length > MAX_STORAGE_BYTES) {
      throw new BrokerError(
        "limit_exceeded",
        `Storage is limited to ${MAX_STORAGE_BYTES} bytes per extension.`
      );
    }
    safeLocalStorage.setItem(sandboxStorageKey(extensionId), json);
  };

  const openPane = (
    params: SandboxMethods["panes.open"]["params"]
  ): SandboxMethods["panes.open"]["result"] => {
    const paneId = scopedId(params.id ?? uuid());
    if (!openPanes.has(paneId) && openPanes.size >= MAX_OPEN_PANES) {
      throw new BrokerError(
        "limit_exceeded",
        `An extension can have at most ${MAX_OPEN_PANES} panes open.`
      );
    }
    const props = (params.props ?? null) as SandboxJsonValue;
    const openKey = uuid();
    const paneTitle = toTitle(params.title);
    openPanes.add(paneId);
    context.panes.openPane({
      id: paneId,
      placement: params.placement,
      title:
        typeof paneTitle === "string"
          ? paneTitle
          : () => <SandboxPaneTitle title={paneTitle} />,
      header: () => <SandboxPaneBadge name={extensionTitle} />,
      component: () => (
        <SandboxViewFrame
          // A fresh frame per open, so reopening by id shows the new props.
          key={openKey}
          connect={(container) =>
            connectFrame(
              { kind: "view", view: params.view, paneId, props },
              container,
              `${extensionTitle}: ${typeof paneTitle === "string" ? paneTitle : paneTitle.defaultValue}`
            )
          }
        />
      ),
      size:
        params.width !== undefined || params.height !== undefined
          ? { width: params.width ?? 480, height: params.height ?? 320 }
          : undefined,
      onClose: () => {
        openPanes.delete(paneId);
        if (!destroyed) {
          broadcast({ type: "event", name: "pane.closed", paneId });
        }
      },
    });
    return { paneId };
  };

  /**
   * Whether the user is interacting with this extension right now, judged
   * only from what the host can see: the browser reports a recent click or
   * key press, and it was on one of this extension's tools or is inside one
   * of its frames. The frame's own claims don't count.
   */
  const userIsInteractingWithExtension = () =>
    hasTransientUserActivation() &&
    (Date.now() - lastToolSelectAt < TOOL_INTERACTION_WINDOW_MS ||
      [...connections].some((connection) => connection.hasFocus?.()));

  const requestOptionalPermissions = async (
    params: SandboxMethods["permissions.request"]["params"]
  ): Promise<SandboxMethods["permissions.request"]["result"]> => {
    const missing = [...new Set(params.permissions)].filter((p) => !has(p));
    const undeclared = missing.filter((p) => !optional.includes(p));
    if (undeclared.length > 0) {
      throw new BrokerError(
        "invalid_request",
        `Only permissions listed under "optionalPermissions" in extension.json can be requested; not: ${undeclared.join(", ")}.`
      );
    }
    if (missing.length === 0) {
      return { granted: true };
    }
    if (missing.some((p) => declined.has(p)) || !options.requestPermissions) {
      return { granted: false };
    }
    if (permissionRequestOpen) {
      throw new BrokerError(
        "limit_exceeded",
        "This extension is already asking for a permission."
      );
    }
    if (!userIsInteractingWithExtension()) {
      throw new BrokerError(
        "invalid_request",
        "Permissions can only be requested right after the user interacts with this extension, e.g. from a tool's onSelect or a click in its pane."
      );
    }
    permissionRequestOpen = true;
    try {
      const agreed = await options.requestPermissions(missing);
      if (destroyed) {
        return { granted: false };
      }
      if (agreed) {
        grantedPermissions.value = [...grantedPermissions.value, ...missing];
      } else {
        for (const permission of missing) {
          declined.add(permission);
        }
      }
      return { granted: agreed };
    } finally {
      permissionRequestOpen = false;
    }
  };

  const dispatch = (
    method: SandboxMethod,
    params: unknown,
    isBackground: boolean
  ): unknown => {
    if (BACKGROUND_ONLY_METHODS.has(method) && !isBackground) {
      throw new BrokerError(
        "invalid_request",
        `'${method}' can only be called from the extension's main code.`
      );
    }
    const required = REQUIRED_PERMISSION[method];
    if (required && !has(required)) {
      throw new BrokerError(
        "permission_denied",
        `'${method}' needs the '${required}' permission, which this extension wasn't granted.`
      );
    }
    switch (method) {
      case "tools.register": {
        const definition = params as SandboxMethods["tools.register"]["params"];
        if (definition.items && definition.items.length === 0) {
          throw new BrokerError(
            "invalid_request",
            "A tool's items can't be empty."
          );
        }
        if (!tools.has(definition.id) && tools.size >= MAX_TOOLS) {
          throw new BrokerError(
            "limit_exceeded",
            `An extension can register at most ${MAX_TOOLS} tools.`
          );
        }
        const previous = tools.get(definition.id);
        if (previous && previous.surface !== definition.surface) {
          unregisterHostTool(previous);
        }
        tools.set(definition.id, definition);
        registerHostTool(definition);
        return null;
      }
      case "tools.update": {
        const { id, patch } =
          params as SandboxMethods["tools.update"]["params"];
        const existing = tools.get(id);
        if (!existing) {
          throw new BrokerError("not_found", `No tool '${id}' is registered.`);
        }
        const next = { ...existing, ...patch };
        tools.set(id, next);
        registerHostTool(next);
        return null;
      }
      case "tools.unregister": {
        const { id } = params as SandboxMethods["tools.unregister"]["params"];
        const existing = tools.get(id);
        if (existing) {
          tools.delete(id);
          unregisterHostTool(existing);
        }
        return null;
      }
      case "panes.open":
        return openPane(params as SandboxMethods["panes.open"]["params"]);
      case "panes.close": {
        const { paneId } = params as SandboxMethods["panes.close"]["params"];
        if (!openPanes.has(paneId)) {
          throw new BrokerError(
            "not_found",
            `This extension has no open pane '${paneId}'.`
          );
        }
        context.panes.closePane(paneId, "programmatic");
        return null;
      }
      case "app.toast": {
        const { message } = params as SandboxMethods["app.toast"]["params"];
        context.app.toast(`${extensionTitle}: ${message}`);
        return null;
      }
      case "reading.open": {
        const ref = params as SandboxMethods["reading.open"]["params"];
        void context.app.openVerseReference({
          book: ref.bookId as BookId,
          chapter: ref.chapter,
          verse: ref.verse,
        });
        return null;
      }
      case "storage.get": {
        const { key } = params as SandboxMethods["storage.get"]["params"];
        return storageGetAll()[key] ?? null;
      }
      case "storage.set": {
        const { key, value } =
          params as SandboxMethods["storage.set"]["params"];
        storageWrite({ ...storageGetAll(), [key]: value });
        return null;
      }
      case "storage.remove": {
        const { key } = params as SandboxMethods["storage.remove"]["params"];
        const data = storageGetAll();
        delete data[key];
        storageWrite(data);
        return null;
      }
      case "storage.keys":
        return Object.keys(storageGetAll());
      case "settings.get": {
        const { key } = params as SandboxMethods["settings.get"]["params"];
        return context.extensionSettings.getValue(extensionId, key) ?? null;
      }
      case "permissions.request":
        return requestOptionalPermissions(
          params as SandboxMethods["permissions.request"]["params"]
        );
      case "ready": {
        const { error } = params as SandboxMethods["ready"]["params"];
        if (!readySettled) {
          readySettled = true;
          if (error) {
            console.error(`Extension '${extensionId}' failed to start:`, error);
            rejectReady(new Error(error));
          } else {
            resolveReady();
          }
        }
        return null;
      }
    }
  };

  const handleMessage = (connection: SandboxFrameConnection, data: unknown) => {
    if (destroyed) {
      return;
    }
    const request = requestSchema.safeParse(data);
    if (!request.success) {
      console.warn(
        `Ignored a malformed message from extension '${extensionId}'.`
      );
      return;
    }
    const { id, method } = request.data;
    const reply = (response: SandboxResponse) => {
      // id 0 is the bootstrap's own failure report, which expects no reply.
      if (id !== 0) {
        post(connection, response);
      }
    };
    const params = paramSchemas[method].safeParse(request.data.params);
    if (!params.success) {
      reply({
        type: "result",
        id,
        ok: false,
        error: {
          code: "invalid_request",
          message: `Invalid '${method}' call: ${z.prettifyError(params.error)}`,
        },
      });
      return;
    }
    const fail = (err: unknown) => {
      reply({
        type: "result",
        id,
        ok: false,
        error:
          err instanceof BrokerError
            ? { code: err.code, message: err.message }
            : { code: "internal", message: "The host couldn't do that." },
      });
      if (!(err instanceof BrokerError)) {
        console.error(`Extension '${extensionId}' call '${method}':`, err);
      }
    };
    try {
      const value = dispatch(method, params.data, connection === background);
      // Only `permissions.request` answers later, once the user has.
      if (value instanceof Promise) {
        value.then(
          (result) => reply({ type: "result", id, ok: true, value: result }),
          fail
        );
      } else {
        reply({ type: "result", id, ok: true, value });
      }
    } catch (err) {
      fail(err);
    }
  };

  const connectFrame = (
    mode: SandboxFrameMode,
    container: HTMLElement | null,
    frameTitle: string
  ): (() => void) => {
    if (destroyed) {
      return () => {};
    }
    const connection = connector({
      extensionId,
      code,
      network,
      container,
      title: frameTitle,
      init: {
        protocol: SANDBOX_PROTOCOL_VERSION,
        extensionId,
        mode,
        granted: [...grantedPermissions.peek()],
        optional: [...optional],
        state: computeState(),
      },
    });
    connection.port.onmessage = (event) =>
      handleMessage(connection, event.data);
    connections.add(connection);
    return () => {
      connections.delete(connection);
      connection.destroy();
    };
  };

  connectFrame({ kind: "background" }, null, extensionTitle);
  background = [...connections][0] ?? null;

  const stopStateEffect = effect(() => {
    const state = computeState();
    broadcast({ type: "state", state });
  });
  // Runs before `permissions.request` replies, so the extension sees the
  // grant as soon as its request resolves.
  const stopPermissionsEffect = effect(() => {
    broadcast({ type: "permissions", granted: [...grantedPermissions.value] });
  });

  const destroy = () => {
    if (destroyed) {
      return;
    }
    destroyed = true;
    stopStateEffect();
    stopPermissionsEffect();
    for (const definition of tools.values()) {
      unregisterHostTool(definition);
    }
    tools.clear();
    for (const paneId of [...openPanes]) {
      context.panes.closePane(paneId, "programmatic");
    }
    openPanes.clear();
    for (const connection of connections) {
      connection.destroy();
    }
    connections.clear();
    background = null;
    if (!readySettled) {
      readySettled = true;
      rejectReady(new Error("The extension was stopped before it started."));
    }
  };

  return { ready, destroy };
}

function SandboxViewFrame({
  connect,
}: {
  connect: (container: HTMLElement) => () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) {
      return;
    }
    return connect(ref.current);
  }, []);
  return <div ref={ref} style={{ width: "100%", height: "100%" }} />;
}

function SandboxPaneTitle({ title }: { title: TranslatableTitle }) {
  const { t } = useI18n();
  return <>{translateTitle(t, title)}</>;
}

/** Labels every sandboxed pane with the extension that drew it. */
function SandboxPaneBadge({ name }: { name: string }) {
  return (
    <span
      style={{
        fontSize: "0.75rem",
        padding: "0.125rem 0.5rem",
        borderRadius: "999px",
        border: "1px solid var(--sb-divider-color)",
        opacity: 0.8,
        whiteSpace: "nowrap",
      }}
    >
      {name}
    </span>
  );
}
