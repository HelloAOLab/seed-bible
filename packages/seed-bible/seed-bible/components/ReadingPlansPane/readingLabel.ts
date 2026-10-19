import type { PlanReading } from "../../managers/ReadingPlansManager";
import { formatRefLabel } from "../ScriptureItemInput/scriptureSuggestions";

/**
 * A short human label for a single reading of any kind: a verse reference for
 * scripture, otherwise the item's own title (falling back to a link's URL, a
 * question's prompt, or a comparison's references). Shared by the wizard, the
 * plans list, and the plan detail view so a plan's readings read the same
 * wherever they appear.
 */
export function readingLabel(
  item: PlanReading["item"],
  resolveBookName: (bookId: string) => string,
  fallback = "Reading"
): string {
  const refLabel = (ref: Parameters<typeof formatRefLabel>[0]) =>
    `${resolveBookName(ref.bookId)} ${formatRefLabel(ref)}`.trim();
  switch (item.type) {
    case "bible-verse":
      return refLabel(item.ref);
    case "html":
      return item.title ?? fallback;
    case "link":
      return item.title ?? item.url;
    case "question":
      return item.title ?? item.prompt ?? fallback;
    case "compare":
      return item.title ?? item.refs.map(refLabel).join(" · ");
    case "scene":
      return item.title || fallback;
  }
}
