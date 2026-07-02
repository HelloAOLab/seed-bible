import type { RenderIconManager } from "ext_discover.interfaces.managers.RenderIconManager";

export interface RenderIconProps {
  isCustomIcons?: boolean;
  big?: boolean;
  small?: boolean;
  isAllowSet?: boolean;
  icon?: string | null;
  list?: any[];
  onDelete?: () => void;
  scope?: string;
  manager?: RenderIconManager;
}
