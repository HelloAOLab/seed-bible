import type { InfoLabelData } from "../../../domain/entities/InfoLabelData";

export interface LabelDataStorePort {
  addLabelData(data: InfoLabelData): void;
  removeLabelData(data: InfoLabelData): void;
  getDataByTransformerId(
    id: InfoLabelData["transformer"]["id"]
  ): InfoLabelData | undefined;
  getDataByTailId(id: InfoLabelData["tail"]["id"]): InfoLabelData | undefined;
  getDataByTextId(id: InfoLabelData["label"]["id"]): InfoLabelData | undefined;
  getDataByOwnerId(id: InfoLabelData["owner"]["id"]): InfoLabelData | undefined;
  getAllLabelsData(): InfoLabelData[];
}
