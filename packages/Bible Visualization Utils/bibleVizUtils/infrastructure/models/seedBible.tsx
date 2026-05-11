import type { BibleVizDataRepository } from "bibleVizUtils.infrastructure.data.BibleVizDataRepository";
import type { ScriptureService } from "bibleVizUtils.application.services.ScriptureService";
import { ReadingHistoryService } from "bibleVizUtils.application.services.ReadingHistoryService";
import { PieceActivityService } from "bibleVizUtils.application.services.PieceActivityService";
import { LabelDateService } from "bibleVizUtils.application.services.LabelDateService";
import type { PieceLabelServiceParams } from "bibleVizUtils.domain.ports.label";
import { type BiblePieceType } from "bibleVizUtils.domain.models.canvas";
import { PieceLabelService } from "bibleVizUtils.application.services.PieceLabelService";
import { BaseEventManager } from "bibleVizUtils.application.services.BaseEventManager";
import type {
  PieceBotTags,
  TypedBot,
} from "bibleVizUtils.infrastructure.models.casualos";
import {
  ObjectPooler,
  type ObjectPoolerConfig,
  type DimensionGetter as ObjectPoolerDimensionGetter,
} from "bibleVizUtils.infrastructure.adapters.casualos.ObjectPooler";
import type { BibleVizUtilsEvents } from "bibleVizUtils.domain.models.events";

export interface BibleVizAPI {
  bibleVizDataRepository: BibleVizDataRepository;
  scriptureService: ScriptureService;
  readingHistoryService: ReadingHistoryService;
  pieceActivityService: PieceActivityService;
  labelDateService: LabelDateService;
  createPieceLabelService: <T extends BiblePieceType>(
    labelPropertiesStrategies: PieceLabelServiceParams<T>["labelPropertiesStrategies"]
  ) => PieceLabelService<T>;
  createEventManager: <
    // @ts-ignore
    TEventMap extends Record<string, any>,
  >() => BaseEventManager<TEventMap>;
  createObjectPooler: <P extends Record<keyof P, TypedBot<PieceBotTags>>>({
    poolsData,
    dimensionGetter,
  }: {
    poolsData: ObjectPoolerConfig<P>;
    dimensionGetter: ObjectPoolerDimensionGetter;
  }) => ObjectPooler<P>;
  bibleVizUtilsEventManager: BaseEventManager<BibleVizUtilsEvents>;
}
