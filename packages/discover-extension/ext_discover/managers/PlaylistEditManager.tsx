import { signal, effect } from "@preact/signals";
import type { PlaylistEditManager } from "ext_discover.interfaces.managers.PlaylistEditManager";
import type {
  EditAttachmentState,
  EditRichTextState,
  PlaylistAnnoEditData,
  PlaylistEditData,
} from "ext_discover.models.playlist";

const G = globalThis as Record<string, any>;

const emptyEditData = (): PlaylistEditData => ({
  color: null,
  id: null,
  name: null,
  description: null,
  icon: null,
});

const emptyEditRichText = (): EditRichTextState => ({
  id: null,
  text: null,
  parentID: null,
  isQuotedText: false,
});

const emptyEditAttachment = (): EditAttachmentState => ({
  id: null,
  parentID: null,
  selectedType: "",
  name: "",
  data: "",
  link: "",
  mediaType: "",
  text: null,
  isQuotedText: false,
});

export function createPlaylistEditManager(): PlaylistEditManager {
  const editData = signal<PlaylistEditData>(
    G.EditDataRestorePlaylist || emptyEditData()
  );
  const editAnnoData = signal<PlaylistAnnoEditData>({
    address: G.EditAnnoDataRestorePlaylist?.address || "",
    title: G.EditAnnoDataRestorePlaylist?.title || "",
  });
  const editRichText = signal<EditRichTextState>({
    id: G.EditRichText?.id ?? null,
    text: G.EditRichText?.text ?? null,
    parentID: G.EditRichText?.parentID ?? null,
    isQuotedText: G.EditRichText?.isQuotedText ?? false,
  });
  const editAttachmentItem = signal<EditAttachmentState>(
    G.EditAttachmentItem || emptyEditAttachment()
  );

  const setEditData = (
    value: PlaylistEditData | ((prev: PlaylistEditData) => PlaylistEditData)
  ) => {
    editData.value =
      typeof value === "function" ? value(editData.value) : value;
  };

  const setEditAnnoData = (value: PlaylistAnnoEditData) => {
    editAnnoData.value = value;
  };

  const setEditRichText = (value: EditRichTextState) => {
    editRichText.value = value;
  };

  const setEditAttachmentItem = (value: EditAttachmentState) => {
    editAttachmentItem.value = value;
  };

  const onCloseEditRichText = () => {
    setEditRichText(emptyEditRichText());
  };

  const onCloseEditAttachmentItem = () => {
    setEditAttachmentItem(emptyEditAttachment());
  };

  effect(() => {
    G.EditAnnoDataRestorePlaylist = { ...editAnnoData.value };
  });

  effect(() => {
    G.EditDataRestorePlaylist = { ...editData.value };
  });

  effect(() => {
    G.EditRichText = { ...editRichText.value };
  });

  effect(() => {
    G.EditAttachmentItem = { ...editAttachmentItem.value };
  });

  effect(() => {
    G.SetEditData = setEditData;
    G.SetEditAnnoData = setEditAnnoData;
    G.SetEditRichText = setEditRichText;
    G.SetEditAttachmentItem = setEditAttachmentItem;
  });

  return {
    editData,
    editAnnoData,
    editRichText,
    editAttachmentItem,
    setEditData,
    setEditAnnoData,
    setEditRichText,
    setEditAttachmentItem,
    onCloseEditRichText,
    onCloseEditAttachmentItem,
  };
}
