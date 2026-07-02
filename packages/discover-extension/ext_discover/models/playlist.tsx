export interface PlaylistGroupMeta {
  active: boolean;
  deleteable: boolean;
  link: string;
}

export type PlaylistGroups = Record<string, PlaylistGroupMeta>;

export interface PlaylistEditData {
  color: string | null;
  id: string | null;
  name: string | null;
  description: string | null;
  icon: string | null;
}

export interface PlaylistAnnoEditData {
  address: string;
  title: string;
}

export interface EditRichTextState {
  id: string | null;
  text: string | null;
  parentID: string | null;
  isQuotedText: boolean;
}

export interface EditAttachmentState {
  id: string | null;
  parentID: string | null;
  parentId?: string | null;
  selectedType: string;
  name: string;
  data: string;
  link: string;
  mediaType: string;
  text: string | null;
  isQuotedText: boolean;
}

export interface CurrentOpenedBook {
  bookId?: string;
  chapter?: number;
  book?: string;
  [key: string]: unknown;
}

export interface OverlayPosition {
  x: number;
  y: number;
}

export type PlayingPlaylistId = false | string;
