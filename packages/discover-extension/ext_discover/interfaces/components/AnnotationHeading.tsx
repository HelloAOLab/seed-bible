export interface AnnotationHeadingProps {
  address: string;
  heading: string;
  tags?: string[];
  data: any[];
  currentOpenedBook: any;
  chapter: number | string;
  deleteOverlay?: string | false;
  setDeleteOverlay?: (value: string | false) => void;
  position?: { current: Record<string, any> };
  setDeleteModal: (value: { address: string; index: number }) => void;
  onDelete: (address: string, index: number) => Promise<void>;
  closeOverlay: () => void;
  index: number;
  setShowFilters?: (value: boolean) => void;
  isPlayingPlaylist?: boolean;
  scope?: string;
  manager?: import("ext_discover.interfaces.managers.AnnotationHeadingManager").AnnotationHeadingManager;
}
