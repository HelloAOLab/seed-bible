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
}

export type SandboxFrameMode =
  | { kind: "background" }
  | {
      kind: "view";
      view: string;
      paneId: string;
      props: SandboxJsonValue;
    };

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
