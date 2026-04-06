const G = globalThis as any;

const id = "default";

G.EditDataRestorePlaylist = null;
G.PublishAccessRestorePlaylist = "public";
G.CustomIconRestorePlaylist = null;
G.SelectedIconRestorePlaylist = null;
G.DescriptionRestorePlaylist = "";
G.OpenModalEditName = false;
G.EDIT_ANNOTATION_DATA = false;
G.EditAttachmentItem = null;
G.StopAttachLinkRetainData = true;
G.EditRichText = null;
G.EditDataRestorePlaylist = null;
G[`${id}creatingPlaylist`] = null;
G.SetRenamingPlaylistEditTitle?.(false);
G.EditAnnoDataRestorePlaylist = null;
G.RenamingPlaylist = false;
G.EditAnnoDataRestorePlaylist = null;
G.LastEditingAnnotationAddress = null;
G.RecordingValue = false;
G.EditAnnoDataRestorePlaylist = null;
G.AddAnotationUI = false;
G.EditIDRestore = false;
G.SetEditData?.((prev: any) => ({
  ...prev,
  id: null,
  name: null,
  description: null,
  icon: null,
  isCustomColor: false,
  color: null,
  isCustomIcon: false,
  selectedTags: null,
  access: "public",
}));
G.HISTORYExploreMode = false;
G[`${id}creatingPlaylistName`] = "";
G[`${id}creatingPlaylist`] = false;
G.PreviousHTML = "";
G[`${id}SetCreatingPlaylist`]?.(false);
G.AnnotationsRecordingData = null;
G.hasRecording = false;
G.VideoRecordTab = null;
G.SetRenamingPlaylistEditTitle?.(false);
G.SetRenamingPlaylist?.(false);
G.SetOpenModalEditName?.(false);
G.SetEditData?.((prev: any) => ({
  id: null,
  name: "",
  description: "",
  icon: "",
  isCustomColor: false,
  color: null,
  isCustomIcon: false,
  selectedTags: null,
  access: "public",
}));
