import type { RenderHTMLContentProps } from "ext_discover.interfaces.components.RenderHTMLContent";

export interface ConfirmationModalProps {
  loading?: boolean;
  title?: string;
  para?: string;
  children?: any;
  onConfirm?: () => void | Promise<void>;
  onClose?: () => void;
  colorSwitch?: boolean;
  ctaText?: string;
  noOnConfirm?: boolean;
  noOnClose?: boolean;
  isParaHTML?: boolean;
  closeCTA?: string;
  noContPadding?: boolean;
  sxContainerModalStyles?: Record<string, any>;
  floatingButton?: boolean;
  modalStyles?: Record<string, any>;
  controlBalInternal?: boolean;
}
