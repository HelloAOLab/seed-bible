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

/**
 * Renders a CasualOS grid or map portal as a cross-origin `ao.bot` iframe.
 * Intended to be used as a pane's `component` (see `PanesManager.openPane`).
 */
export function PortalComponent(props: PortalComponentProps) {
  const { portal, portalType, pattern, inst } = props;
  const portalTitle = portalType === "map" ? "Map Portal" : "Grid Portal";

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
        src={iframeUrl.toString()}
        referrerPolicy={"origin-when-cross-origin"}
        allow={allow}
      ></iframe>
    </>
  );
}
