import type { ComponentChildren } from "preact";

// Stands in for the element in a translated sentence, so it can go wherever
// the language puts it.
const SLOT = "\u0000";

/**
 * `text`, translated with `slot` as the placeholder value the element fills,
 * e.g. `withSlot((host) => t("from-x", { host }), <SourceLabel />)`.
 */
export function withSlot(
  text: (slot: string) => string,
  element: ComponentChildren
) {
  const [before, after = ""] = text(SLOT).split(SLOT);
  return (
    <>
      {before}
      {element}
      {after}
    </>
  );
}
