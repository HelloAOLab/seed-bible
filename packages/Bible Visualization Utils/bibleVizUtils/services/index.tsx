import { StackService } from "bibleVizUtils.services.StackService";
import { ScriptureService } from "bibleVizUtils.services.ScriptureService";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { ReadingHistoryService } from "bibleVizUtils.services.ReadingHistoryService";
import { SessionService } from "bibleVizUtils.services.SessionService";
import { ArrangementService } from "bibleVizUtils.services.ArrangementService";
import { PieceActivityService } from "bibleVizUtils.services.PieceActivityService";
import { PieceActivityIndicatorsRepository } from "bibleVizUtils.data.PieceActivityIndicatorsRepository";
import { PieceDataRegistry } from "bibleVizUtils.services.PieceDataRegistry";
import { UserColorStore } from "bibleVizUtils.services.UserColorStore";
import { UserPresenceService } from "bibleVizUtils.services.UserPresenceService";
import { SeedBiblePresenceProvider } from "bibleVizUtils.adapters.SeedBiblePresenceProvider";
import { BaseEventManager } from "bibleVizUtils.services.BaseEventManager";
import type { BibleVizUtilsEvent } from "bibleVizUtils.models.events";

export const bibleVizUtilsEventManager =
  new BaseEventManager<BibleVizUtilsEvent>();
const tenDaysAgo = new Date();
tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
tenDaysAgo.setHours(0, 0, 0, 0);
const tenDaysAgoTimeSeconds = Math.floor(tenDaysAgo.getTime() / 1000);

export const seedBiblePresenceProvider = new SeedBiblePresenceProvider();
export const userColorStore: UserColorStore = new UserColorStore(
  bibleVizUtilsEventManager
);
export const stackService = new StackService();
export const readingHistoryService = new ReadingHistoryService(
  tenDaysAgoTimeSeconds
);
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
export const userPresenceService = new UserPresenceService({
  eventManager: bibleVizUtilsEventManager,
  userPresenceProvider: seedBiblePresenceProvider,
});
