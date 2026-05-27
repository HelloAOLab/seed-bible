import { BaseEventManager } from "bibleVizUtils.services.BaseEventManager";
import type { ScriptureMap2DEvent } from "scriptureMap2D.models.events";

export const scriptureMap2DEventManager =
  new BaseEventManager<ScriptureMap2DEvent>();
