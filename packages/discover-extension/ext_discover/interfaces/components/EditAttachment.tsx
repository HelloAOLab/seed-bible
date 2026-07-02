export interface EditAttachmentProps {
  id?: string;
  contentId: string;
  selectedType?: string;
  name?: string;
  isQuotedText?: boolean;
  data?: unknown;
  link?: string;
  mediaType?: string;
  parentID: string;
  onClose: () => void;
}
