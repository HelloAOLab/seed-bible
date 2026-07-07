import { InfoLabelData } from "bibleVizUtils.domain.entities.InfoLabelData";
import type { LabelDataStorePort } from "bibleVizUtils.domain.ports.piece";

interface LabelDataStoreProps {
  labelDataSet?: Set<InfoLabelData>;
}

export class LabelDataStore implements LabelDataStorePort {
  #labelDataSet: NonNullable<LabelDataStoreProps["labelDataSet"]>;

  constructor({ labelDataSet = new Set() }: LabelDataStoreProps) {
    this.#labelDataSet = labelDataSet;
  }

  addLabelData(data: InfoLabelData) {
    this.#labelDataSet.add(data);
  }

  removeLabelData(data: InfoLabelData) {
    this.#labelDataSet.delete(data);
  }

  getDataByTransformerId(
    id: InfoLabelData["transformer"]["id"]
  ): InfoLabelData | undefined {
    for (const data of this.#labelDataSet) {
      if (data.getTransformerProperty("id") === id) {
        return data;
      }
    }

    return undefined;
  }

  getDataByTailId(id: InfoLabelData["tail"]["id"]): InfoLabelData | undefined {
    for (const data of this.#labelDataSet) {
      if (data.getTailProperty("id") === id) {
        return data;
      }
    }

    return undefined;
  }

  getDataByTextId(id: InfoLabelData["label"]["id"]): InfoLabelData | undefined {
    for (const data of this.#labelDataSet) {
      if (data.getTextProperty("id") === id) {
        return data;
      }
    }

    return undefined;
  }

  getDataByOwnerId(id: InfoLabelData["owner"]["id"]) {
    for (const data of this.#labelDataSet) {
      if (data.getOwnerProperty("id") === id) {
        return data;
      }
    }

    return undefined;
  }

  getAllLabelsData(): InfoLabelData[] {
    return Array.from(this.#labelDataSet);
  }
}
