import "./PortalComponent.css";
export type CasualOSPattern =
  | {
      name: string;
    }
  | {
      aux: string;
    };
export interface PortalComponentProps {
  /** Grid/map portal identifier to load in the iframe. */
  portal: string;
  /** Which CasualOS portal to open. */
  portalType: "grid" | "map";
  /** The instance identifier for the portal's content. */
  inst: string;
  /**
   * The pattern that should be loaded in the portal. When null, the
   * `pattern`/`patternAux` query param is omitted entirely rather than
   * guessing a default pattern name that might not exist.
   */
  pattern: CasualOSPattern | null;
  /** Query parameters for the portal's content. */
  query?: Record<string, string> | null;
}
/**
 * Renders a CasualOS grid or map portal as a cross-origin `ao.bot` iframe.
 * Intended to be used as a pane's `component` (see `PanesManager.openPane`).
 */
export declare function PortalComponent(
  props: PortalComponentProps
): import("preact").JSX.Element;
