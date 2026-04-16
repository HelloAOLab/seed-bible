import { BaseEventManager } from "@packages/Bible Visualization Utils/bibleVizUtils/services/BaseEventManager";
import { PieceDataRepository } from "bibleStack.services.PieceDataRepository";
import type { BibleStackEvents } from "bibleStack.models.events";
import { ExperienceService } from "bibleStack.services.ExperienceService";
import { PortalAdapter } from "bibleStack.adapters.portalAdapter";
import { StackService } from "bibleStack.services.StackService";

const portalAdapter = new PortalAdapter();
export const pieceDataRepository = new PieceDataRepository();
export const bibleStackEventManager = new BaseEventManager<BibleStackEvents>();
export const stackService = new StackService();
export const experienceService = new ExperienceService({
  portalPort: portalAdapter,
  stackService,
});
