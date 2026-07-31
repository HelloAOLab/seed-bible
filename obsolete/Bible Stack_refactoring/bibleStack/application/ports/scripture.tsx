import type { CompletePsalm } from "bibleVizUtils.application.services.ScriptureService";
import type { BookName } from "bibleVizUtils.domain.models.scripture";

export interface ScriptureServicePort {
  convertDividedPsalmsToComplete(params: {
    book: BookName;
    chapter: number;
  }): CompletePsalm;
}
