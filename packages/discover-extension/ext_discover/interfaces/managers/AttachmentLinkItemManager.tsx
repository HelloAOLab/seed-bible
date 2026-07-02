import type { Signal } from "@preact/signals";

export interface AttachmentLinkItemManager {
  editDateModal: Signal<boolean>;
  date: Signal<string>;
  setDatePickerRef: (element: HTMLInputElement | null) => void;
  setEditDateModal: (value: boolean) => void;
  setDate: (value: string) => void;
  clickDatePicker: () => void;
  onDateSave: (
    setList: (updater: (prev: any[]) => any[]) => void,
    data: any,
    date?: string
  ) => void;
  syncInitialDate: (data: any) => void;
}
