import type { InfoLabelData } from "../../../domain/entities/InfoLabelData";

export interface LabelDataRepositoryPort {
  getDataByTransformerId(id: string): InfoLabelData | undefined;
}
