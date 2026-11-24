import { z } from "zod";
import { createEditorDraftStore } from "./EditorDrafts";
import { ReadingPlanSchema } from "./ReadingPlansManager";

/**
 * Unsaved edits to a published reading plan, kept in this browser (see
 * `EditorDrafts`). A plan not yet published needs none: it's saved to the
 * author's account as a draft as they go.
 */
const store = createEditorDraftStore(
  "sb-reading-plan-draft:v1:",
  // Built on first use: ReadingPlansManager imports this module, so its schema
  // isn't defined yet while this one first loads.
  () =>
    z.object({
      /** The plan as edited. */
      draft: ReadingPlanSchema,
      /** The plan as it was when editing began, to tell what changed. */
      baseline: ReadingPlanSchema,
      /** When it was last edited, to say how old it is. */
      editedAtMs: z.number().optional(),
    })
);

export const readReadingPlanDraft = store.read;
export const writeReadingPlanDraft = store.write;
export const clearReadingPlanDraft = store.clear;
