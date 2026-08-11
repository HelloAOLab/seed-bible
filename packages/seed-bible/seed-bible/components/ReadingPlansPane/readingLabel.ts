import type { PlanReading } from "../../managers/ReadingPlansManager";
import { formatRefLabel } from "../ScriptureItemInput/scriptureSuggestions";

/**
 * A short human label for a single reading of any kind: a verse reference for
 * scripture, otherwise the item's own title (falling back to a link's URL).
 * Shared by the wizard, the plans list, and the plan detail view so a plan's
 * readings read the same wherever they appear.
 */
export function readingLabel(
  item: PlanReading["item"],
  resolveBookName: (bookId: string) => string,
  fallback = "Reading"
): string {
  if (item.type === "bible-verse") {
    return `${resolveBookName(item.ref.bookId)} ${formatRefLabel(
      item.ref
    )}`.trim();
  }
  if (item.type === "html") {
    return item.title ?? fallback;
  }
  return item.title ?? item.url;
}
