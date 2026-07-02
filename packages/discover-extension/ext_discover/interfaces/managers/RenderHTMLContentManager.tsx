import type { Signal } from "@preact/signals";

export interface RenderHTMLContentManager {
  shouldRender: Signal<boolean>;
  open: Signal<boolean>;
  addToQueuePopup: Signal<boolean>;
  setContainerRef: (element: HTMLDivElement | null) => void;
  toggleOpen: () => void;
  setAddToQueuePopup: (value: boolean) => void;
  handlePlayCircleClick: (e: any, bypassQueue?: boolean) => Promise<void>;
  syncHtmlContent: (htmlContent: string) => void;
}
