import type { Signal } from "@preact/signals";
import type {
  EditAttachmentState,
  EditRichTextState,
  PlaylistAnnoEditData,
  PlaylistEditData,
} from "ext_discover.models.playlist";

export interface PlaylistEditManager {
  editData: Signal<PlaylistEditData>;
  editAnnoData: Signal<PlaylistAnnoEditData>;
  editRichText: Signal<EditRichTextState>;
  editAttachmentItem: Signal<EditAttachmentState>;
  setEditData: (
    value: PlaylistEditData | ((prev: PlaylistEditData) => PlaylistEditData)
  ) => void;
  setEditAnnoData: (value: PlaylistAnnoEditData) => void;
  setEditRichText: (value: EditRichTextState) => void;
  setEditAttachmentItem: (value: EditAttachmentState) => void;
  onCloseEditRichText: () => void;
  onCloseEditAttachmentItem: () => void;
}
