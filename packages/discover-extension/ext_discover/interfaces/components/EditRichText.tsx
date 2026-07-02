import type { EditRichTextManager } from "ext_discover.interfaces.managers.EditRichTextManager";

export interface EditRichTextProps {
  onClose: () => void;
  contentId: string;
  parentID: string;
  text?: string;
  isQuotedText?: boolean;
  playlistId?: string;
  manager?: EditRichTextManager;
}
