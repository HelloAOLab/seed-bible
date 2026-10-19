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
  type SandboxErrorCode,
  type SandboxHostMessage,
  type SandboxIcon,
  type SandboxInit,
  type SandboxJsonValue,
  type SandboxMethod,
  type SandboxMethods,
  type SandboxPaneOptions,
  type SandboxPermission,
  type SandboxReadingPosition,
  type SandboxSelectedVerse,
  type SandboxState,
  type SandboxTitle,
  type SandboxToolDefinition,
  type SandboxToolItem,
  type SandboxToolPatch,
  type SandboxToolSurface,
  type SandboxVerseRef,
} from "./protocol";

export type {
  SandboxIcon,
  SandboxJsonValue,
  SandboxPaneOptions,
  SandboxPermission,
  SandboxReadingPosition,
  SandboxSelectedVerse,
  SandboxTitle,
  SandboxVerseRef,
};
export { SANDBOX_PERMISSIONS } from "./protocol";

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

export interface SandboxPaneHandle {
  paneId: string;
  close: () => Promise<void>;
  /** Called once when the pane closes, however it closed. */
  onClose: (listener: () => void) => void;
}

export interface SandboxContext {
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
  };
}

export interface SandboxViewProps {
  sb: SandboxContext;
  /** Whatever was passed as `props` to `sb.panes.open`. */
  props: SandboxJsonValue;
  /** The pane this view is rendered in. */
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
  const paneCloseListeners = new Map<string, (() => void)[]>();
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
    } else if (message.name === "pane.closed") {
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
  const language = signal(init.state.language);
  const direction = signal(init.state.direction);
  effect(() => {
    position.value = state.value.position;
    selection.value = state.value.selection;
    isMobile.value = state.value.isMobile;
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
      open: async (options) => {
        const { paneId } = await call("panes.open", options);
        return {
          paneId,
          close: () => call("panes.close", { paneId }).then(() => {}),
          onClose: (listener) => {
            const listeners = paneCloseListeners.get(paneId) ?? [];
            listeners.push(listener);
            paneCloseListeners.set(paneId, listeners);
          },
        };
      },
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
      const { view, paneId, props } = init.mode;
      const View = definition.views?.[view];
      const root =
        document.getElementById("root") ??
        document.body.appendChild(document.createElement("div"));
      if (!View) {
        root.textContent = `Unknown view "${view}".`;
        return;
      }
      render(<View sb={sb} props={props} paneId={paneId} />, root);
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
