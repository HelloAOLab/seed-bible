import type { AttachLinkManager } from "ext_discover.interfaces.managers.AttachLinkManager";
import type { AttachLinkSubComponentManager } from "ext_discover.interfaces.managers.AttachLinkSubComponentManager";

export interface AttachLinkProps {
  sSelectedType?: string;
  sName?: string;
  sData?: any;
  sLink?: string;
  sMediaType?: string;
  editMode?: boolean;
  canRecord?: boolean;
  onClose?: () => void;
  canClose?: boolean;
  onAddTags?: (tags: string[]) => void;
  massAdd: (items: any[]) => void;
  attachLink: (name: string, link: any, meta?: Record<string, any>) => void;
  isDate?: boolean;
  onDateClick?: (date: string) => void;
  isTags?: boolean;
  isPlaylist?: boolean;
  showSaveButton?: boolean;
  sIsQuotedText?: boolean;
  manager?: AttachLinkManager;
  subManager?: AttachLinkSubComponentManager;
}

export interface AttachLinkSubComponentProps {
  manager: AttachLinkManager;
  subManager: AttachLinkSubComponentManager;
  showChangeOptions?: boolean;
}
