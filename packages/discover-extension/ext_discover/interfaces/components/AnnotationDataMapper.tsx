export interface AnnotationDataMapperProps {
  data: any[];
  address: string;
  currentOpenedBook: any;
  chapter: number | string;
  heading: string;
  onDelete: () => void;
  isPlayingPlaylist?: boolean;
  scope?: string;
}
