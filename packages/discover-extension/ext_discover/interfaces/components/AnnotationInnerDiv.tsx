import type { AnnotationInnerDivManager } from "ext_discover.interfaces.managers.AnnotationInnerDivManager";

export interface AnnotationInnerDivProps {
  data: any;
  onRemoveTag: (indexofTag: number, idOfParent?: string) => void;
  onDisembed: (ids: any, isDelete?: boolean) => void;
  index: number;
  embedding: string | boolean | null;
  pId?: string | null;
  isEditAddress: any;
  checklistEnabled: boolean | string | null;
  finalHistoryObject: any[];
  setList: (value: any[] | ((prev: any[]) => any[])) => void;
  setChecklistEmbeded: (id: any, pId: string) => void;
  checkListData: Record<string, boolean>;
  selectedAnnotation: string | null;
  checkListEmbeded: Record<string, any>;
  originalIndex?: number;
  editDataFromPlaylist: (receivedIds: any) => void;
  isSomethingEmbededChecked: boolean;
  onClick?: (id: string) => void;
  deleteAttachment: (index: number, pID: string, id: string) => void;
  selected: boolean;
  setEmbedding: (value: string | boolean | null) => void;
  dragOverSet: { position: string; itemId: any; pId: any };
  onClickCheckbox?: () => void;
  deleteFromList: (id: string, pid?: string) => void;
  singleMode: boolean;
  embeded?: boolean;
  handleDragStart: (index: number, pId: string | null) => void;
  handleDragOver: (
    index: number,
    pseudoIndex: number | null,
    pseudoID: string | null,
    event: any
  ) => void;
  handleDragEnd: () => void;
  manager?: AnnotationInnerDivManager;
}
