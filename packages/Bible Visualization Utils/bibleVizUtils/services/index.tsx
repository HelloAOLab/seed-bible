import { StackService } from "bibleVizUtils.services.StackService";
import { ScriptureService } from "bibleVizUtils.services.ScriptureService";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { ReadingHistoryService } from "bibleVizUtils.services.ReadingHistoryService";
import { SessionService } from "bibleVizUtils.services.SessionService";
import { BibleVizUtilsEventManager } from "bibleVizUtils.services.EventManager";
import { ArrangementService } from "bibleVizUtils.services.ArrangementService";
import { PieceActivityService } from "bibleVizUtils.services.PieceActivityService";
import { PieceActivityIndicatorsRepository } from "bibleVizUtils.data.PieceActivityIndicatorsRepository";
import { PieceDataRegistry } from "bibleVizUtils.services.PieceDataRegistry";

export const bibleVizUtilsEventManager = new BibleVizUtilsEventManager();
export const stackService = new StackService(BibleVizDataRepository);
export const readingHistoryService = new ReadingHistoryService();
export const sessionService = new SessionService(bibleVizUtilsEventManager);
export const arrangementService = new ArrangementService(
  BibleVizDataRepository,
  bibleVizUtilsEventManager
);
export const scriptureService = new ScriptureService(
  BibleVizDataRepository,
  arrangementService
);
export const pieceActivityService = new PieceActivityService({
  dataRegistry: PieceDataRegistry,
  indicatorsRepository: PieceActivityIndicatorsRepository,
  arrangementService,
  scriptureService,
});
