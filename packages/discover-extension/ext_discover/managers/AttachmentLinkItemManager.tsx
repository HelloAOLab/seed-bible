import { effect, signal } from "@preact/signals";
import type { AttachmentLinkItemManager } from "ext_discover.interfaces.managers.AttachmentLinkItemManager";

const G = globalThis as Record<string, any>;

const managersByScope = new Map<string, AttachmentLinkItemManager>();

export function getAttachmentLinkItemManager(
  scope: string
): AttachmentLinkItemManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createAttachmentLinkItemManager();
  managersByScope.set(scope, manager);
  return manager;
}

export function createAttachmentLinkItemManager(): AttachmentLinkItemManager {
  const editDateModal = signal(false);
  const date = signal("");
  const datePickerElement = signal<HTMLInputElement | null>(null);

  effect(() => {
    const element = datePickerElement.value;
    if (!element) return;
    (window as any).flatpickr(element, {
      dateFormat: "m/d/Y",
      allowInput: false,
    });
  });

  const onDateSave = (
    setList: (updater: (prev: any[]) => any[]) => void,
    data: any,
    nextDate?: string
  ) => {
    setList((prev: any[]) => {
      const old = [...prev];
      const index = old.findIndex((ele) => ele.id === data.id);
      if (index > -1) {
        old[index] = {
          ...old[index],
          content: G.FORMAT_DATE(
            nextDate?.replaceAll("/", "-") || "",
            "DEFAULT",
            "MM-DD-YYYY"
          ),
          additionalInfo: {
            date: G.FORMAT_YYYY_MM_DD(
              new Date(`${nextDate?.replaceAll("/", "-") || ""} 12:00:00`)
            ),
          },
        };
      }
      return old;
    });
  };

  return {
    editDateModal,
    date,
    setDatePickerRef: (element: HTMLInputElement | null) => {
      datePickerElement.value = element;
    },
    setEditDateModal: (value: boolean) => {
      editDateModal.value = value;
    },
    setDate: (value: string) => {
      date.value = value;
    },
    clickDatePicker: () => {
      datePickerElement.value?.click();
    },
    onDateSave,
    syncInitialDate: (data: any) => {
      date.value = G.FORMAT_YYYY_MM_DD(data.additionalInfo.date || new Date());
    },
  };
}
