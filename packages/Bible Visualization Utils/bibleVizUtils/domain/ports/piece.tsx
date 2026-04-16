import type { InfoLabelData } from "bibleVizUtils.domain.entities.InfoLabelData";

export interface LabelDataStorePort {
  getDataByTransformerId: (
    id: InfoLabelData["transformer"]["id"]
  ) => InfoLabelData | undefined;
  addLabelData: (data: InfoLabelData) => void;
  removeLabelData: (data: InfoLabelData) => void;
  getAllLabelsData: () => InfoLabelData[];
  getDataByOwnerId: (id: string) => InfoLabelData | undefined;
}
