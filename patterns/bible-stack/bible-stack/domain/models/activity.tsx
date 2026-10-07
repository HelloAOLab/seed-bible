import type { InfoLabelData } from "../entities/InfoLabelData";
import type { StackChapterData } from "../entities/StackChapterData";

export type ActivityContainer = InfoLabelData | StackChapterData;

export type NotifiableContainer = StackChapterData;

export type ActivityContainerType = "label" | "piece";
