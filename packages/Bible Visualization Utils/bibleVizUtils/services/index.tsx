import { StackService } from "bibleVizUtils.services.StackService";
import { ScriptureService } from "bibleVizUtils.services.ScriptureService";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";

export const stackService = new StackService(BibleVizDataRepository);
export const scriptureService = new ScriptureService(BibleVizDataRepository);
