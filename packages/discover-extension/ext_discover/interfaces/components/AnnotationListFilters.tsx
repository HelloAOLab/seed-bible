import type { SearchAndAddManager } from "ext_discover.interfaces.managers.SearchAndAddManager";
import type { AnnotationListFiltersManager } from "ext_discover.interfaces.managers.AnnotationListFiltersManager";

export interface AnnotationListFiltersProps {
  onChangeFilters: (key: string, value: string) => void;
  onClearFilters: (key?: string) => void;
  filters: any;
  annotationSources: any[];
  tagsSources: any[];
  currentOpenedBook: any;
  showAtBottom?: boolean;
  handleClose: () => void;
  scope?: string;
  filtersManager?: AnnotationListFiltersManager;
}

export interface SearchAndAddProps {
  onChangeFilters: (key: string, value: string) => void;
  onClearFilters: (key?: string) => void;
  filters?: any;
  sources: any[];
  selectedSources: Record<string, boolean>;
  keySources?: string;
  placeholder?: string;
  scope?: string;
  manager?: SearchAndAddManager;
}
