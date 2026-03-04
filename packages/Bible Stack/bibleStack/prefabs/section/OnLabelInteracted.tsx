/**
 * Triggers an OnStackSectionInteracted event when the section's label has been interacted.
 * @example
 * section.OnLabelInteracted()
 */

shout("OnStackSectionInteracted", {
  section: thisBot,
  typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.Tap,
});
