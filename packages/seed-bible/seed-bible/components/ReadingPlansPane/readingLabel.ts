import type { PlanReading } from "../../managers/ReadingPlansManager";
import { formatRefLabel } from "../ScriptureItemInput/scriptureSuggestions";

/**
 * A short human label for a single reading of any kind: a verse reference for
 * scripture (both, for two passages compared), otherwise the item's own title
 * (falling back to a link's page title, then its URL).
 * Shared by the wizard, the plans list, and the plan detail view so a plan's
 * readings read the same wherever they appear.
 */
export function readingLabel(
  item: PlanReading["item"],
  resolveBookName: (bookId: string) => string,
  fallback = "Reading"
): string {
  if (item.type === "bible-verse") {
    const passage = (ref: typeof item.ref) =>
      `${resolveBookName(ref.bookId)} ${formatRefLabel(ref)}`.trim();
    return item.compare
      ? `${passage(item.ref)} / ${passage(item.compare.ref)}`
      : passage(item.ref);
  }
  if (item.type === "html") {
    return item.title?.trim() || fallback;
  }
  return item.title?.trim() || item.preview?.title || item.url;
}
