export interface SelectionOptionItem {
  key?: string;
  label: string;
  onClick?: (option: SelectionOptionItem) => void;
  metaData?: { list?: unknown[] };
}

export interface SelectionOptionsProps {
  handleClose: () => void;
  options: SelectionOptionItem[];
  dontCloseOnClick?: boolean;
  isPlaylist?: boolean;
  onClickOption?: (option: SelectionOptionItem) => void;
  loading?: boolean;
}
