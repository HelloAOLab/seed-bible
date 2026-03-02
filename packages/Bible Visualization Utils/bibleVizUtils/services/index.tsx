import { StackService } from "bibleVizUtils.services.StackService";
import { ScriptureService } from "bibleVizUtils.services.ScriptureService";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { ReadingHistoryService } from "bibleVizUtils.services.ReadingHistoryService";
import { SessionService } from "bibleVizUtils.services.SessionService";
import { bibleVizUtilsEventManager } from "bibleVizUtils.services.EventManager";
import { ArrangementService } from "bibleVizUtils.services.ArrangementService";

export const stackService = new StackService(BibleVizDataRepository);
export const scriptureService = new ScriptureService(BibleVizDataRepository);
export const readingHistoryService = new ReadingHistoryService();
export const sessionService = new SessionService(bibleVizUtilsEventManager);
export const arrangementService = new ArrangementService(
  BibleVizDataRepository,
  bibleVizUtilsEventManager
);
