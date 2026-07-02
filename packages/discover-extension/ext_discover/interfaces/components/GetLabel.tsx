import type { GetLabelManager } from "ext_discover.interfaces.managers.GetLabelManager";

export interface GetLabelProps {
  value: string;
  currentOpenedBook?: { book?: string; chapter?: number };
  widthCompare?: number;
  fontSize?: string | number;
  needToShowInMobile?: boolean;
  instanceKey?: string;
  manager?: GetLabelManager;
}
