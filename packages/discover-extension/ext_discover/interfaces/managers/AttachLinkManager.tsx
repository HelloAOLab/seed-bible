import type { ReadonlySignal, Signal } from "@preact/signals";
import type { AttachLinkProps } from "ext_discover.interfaces.components.AttachLink";

export interface AttachLinkDragState {
  isDragOver: boolean;
}

export interface AttachLinkManager {
  loading: Signal<boolean>;
  selectedType: Signal<string>;
  textType: Signal<string>;
  mediaType: Signal<string>;
  data: Signal<any>;
  linkState: Signal<any>;
  name: Signal<string>;
  link: Signal<string>;
  isQuotedText: Signal<boolean>;
  recordingType: Signal<string>;
  dragState: Signal<AttachLinkDragState>;
  dragRefElement: Signal<HTMLElement | null>;
  datePickerElement: Signal<HTMLElement | null>;
  filteredTags: ReadonlySignal<string[]>;
  isDisabled: ReadonlySignal<boolean>;
  playlists: ReadonlySignal<any[]>;
  playlistListOptions: ReadonlySignal<{ label: string; value: string }[]>;
  editMode: ReadonlySignal<boolean>;
  canClose: ReadonlySignal<boolean>;
  isDate: ReadonlySignal<boolean>;
  setLoading: (value: boolean) => void;
  setSelectedType: (value: string) => void;
  setTextType: (value: string) => void;
  setMediaType: (value: string) => void;
  setData: (value: any | ((prev: any) => any)) => void;
  setLinkState: (value: any) => void;
  setName: (value: string) => void;
  setLink: (value: string) => void;
  setIsQuotedText: (value: boolean) => void;
  setRecordingType: (value: string) => void;
  setDragRef: (el: HTMLElement | null) => void;
  setDatePickerRef: (el: HTMLElement | null) => void;
  onAddFiles: (files: any[]) => Promise<void>;
  deleteFromList: (id: string) => void;
  onClickSend: (isForce?: boolean) => Promise<void>;
  handleTypeSwitch: (ele: string) => void;
  handleClose: () => void;
  syncProps: (props: AttachLinkProps) => void;
  mount: (scope: string) => void;
}
