export interface OverlayMenuItem {
  label: string;
  icon?: string;
  disabled?: boolean;
  noBorderBottom?: boolean;
  click: () => void;
}

export interface OverlayProps {
  position?: Record<string, any>;
  onClose: () => void;
  positionOverRide?: Record<string, any>;
  items?: OverlayMenuItem[];
  styles?: Record<string, any>;
  children?: any;
}
