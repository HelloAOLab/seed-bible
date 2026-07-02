import type { AnnotationListManager } from "ext_discover.interfaces.managers.AnnotationListManager";

export interface AnnotationListProps {
  currentOpenedBook: any;
  chapter?: number | string;
  fetchingAnnotation: boolean;
  setAnnotationData: (updater: any) => void;
  annotationData: any[];
  annotationSources: any[];
  tagsSources: any[];
  isPlayingPlaylist?: boolean;
  scope?: string;
  manager?: AnnotationListManager;
}
