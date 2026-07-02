import type { Signal } from "@preact/signals";

export interface EditRichTextManager {
  name: Signal<string>;
  quotedText: Signal<boolean>;
  onSave: (onClose: () => void) => void;
  syncProps: (props: {
    text?: string;
    isQuotedText?: boolean;
    contentId: string;
    parentID: string;
    playlistId?: string;
  }) => void;
}
