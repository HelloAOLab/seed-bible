import "./PortalComponent.css";
import { useRef } from "preact/hooks";

export type CasualOSPattern = { name: string } | { aux: string };

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

/** Builds the `ao.bot` iframe URL for a portal from its props. */
function buildIframeUrl(props: PortalComponentProps): string {
  const { portal, portalType, pattern, inst } = props;
  const iframeUrl = new URL("https://ao.bot/");

  iframeUrl.searchParams.set("inst", inst);

  if (portalType === "map") {
    iframeUrl.searchParams.set("mapPortal", portal);
  } else if (portalType === "grid") {
    iframeUrl.searchParams.set("gridPortal", portal);
  }

  if (pattern) {
    if ("aux" in pattern) {
      iframeUrl.searchParams.set("patternAux", pattern.aux);
    } else {
      iframeUrl.searchParams.set("pattern", pattern.name);
    }
  }

  if (props.query) {
    for (const [key, value] of Object.entries(props.query)) {
      iframeUrl.searchParams.set(key, value);
    }
  }

  return iframeUrl.toString();
}

/**
 * Renders a CasualOS grid or map portal as a cross-origin `ao.bot` iframe.
 * Intended to be used as a pane's `component` (see `PanesManager.openPane`).
 */
export function PortalComponent(props: PortalComponentProps) {
  const { portal, portalType } = props;
  const portalTitle = portalType === "map" ? "Map Portal" : "Grid Portal";

  // The iframe URL is computed exactly once, when this component first mounts,
  // and cached for the life of the mounted instance. Re-renders (a pane being
  // dragged, resized, selected, or brought to the front) therefore never
  // reassign the iframe's `src`, so the embedded CasualOS portal keeps its live
  // document instead of reloading. This also makes the component robust against
  // callers that (re)generate an `inst`/`query` value inside their render
  // function — a fresh value there no longer forces the iframe to reload.
  //
  // Loading a *different* portal is done by opening a pane whose component has a
  // different identity, which unmounts this instance and mounts a fresh one;
  // the new mount then rebuilds the URL from the new props.
  const iframeSrcRef = useRef<string | null>(null);
  if (iframeSrcRef.current === null) {
    iframeSrcRef.current = buildIframeUrl(props);
  }

  let allow = "";

  if (import.meta.env.DEV) {
    allow += "local-network-access";
  }

  return (
    <>
      <div className="sb-grid-portal-pane">
        <div className="sb-grid-portal-pane-badge">{portalTitle}</div>
        <div className="sb-grid-portal-pane-name">{portal}</div>
      </div>
      <iframe
        className="sb-grid-portal-pane-iframe"
        src={iframeSrcRef.current}
        referrerPolicy={"origin-when-cross-origin"}
        allow={allow}
      ></iframe>
    </>
  );
}
