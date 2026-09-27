import type { InfoLabelData } from "../../../domain/entities/InfoLabelData";
import type { StackSectionData } from "../../../domain/entities/StackSectionData";
import type { StackUpdatePacing } from "../../../domain/models/stacks";

export interface LabelDataStorePort {
  getDataByOwnerId(id: string): InfoLabelData | undefined;
}

export interface SectionSelectionAdapterPort {
  select: (
    data: StackSectionData,
    pacing?: StackUpdatePacing | undefined
  ) => Promise<void>;
  deselect: (data: StackSectionData) => Promise<void>;
}
