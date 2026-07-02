import { effect, signal } from "@preact/signals";
import type {
  PersonVideoOverlaySize,
  PersonVideoSizeOption,
  ShowPersonVideoOverlayManager,
} from "ext_discover.interfaces.managers.ShowPersonVideoOverlayManager";

const G = globalThis as Record<string, any>;

const SIZE_OPTIONS: PersonVideoSizeOption[] = [
  { size: "8px", value: "s" },
  { size: "12px", value: "m" },
  { size: "16px", value: "l" },
];

let singleton: ShowPersonVideoOverlayManager | undefined;

export function getShowPersonVideoOverlayManager(): ShowPersonVideoOverlayManager {
  if (!singleton) {
    singleton = createShowPersonVideoOverlayManager();
  }
  return singleton;
}

export function createShowPersonVideoOverlayManager(): ShowPersonVideoOverlayManager {
  const visible = signal(false);
  const overlaySize = signal<PersonVideoOverlaySize>("s");
  const position = signal<{ x: number | string; y: number | string }>({
    x: 50,
    y: 50,
  });
  const videoElement = signal<HTMLVideoElement | null>(null);

  let dragging = false;
  let dragStart = { x: 0, y: 0 };
  let initialPos = { x: 0, y: 0 };
  let lastPosBeforeFullScreen = { x: 50, y: 50 };
  let lastSizeBeforeFullScreen: PersonVideoOverlaySize = "s";
  let mediaStream: MediaStream | null = null;

  const stopVideo = () => {
    if (videoElement.value?.srcObject) {
      (videoElement.value.srcObject as MediaStream)
        .getTracks()
        .forEach((track) => track.stop());
      videoElement.value.srcObject = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
  };

  const startVideo = async (element: HTMLVideoElement) => {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      element.srcObject = mediaStream;
      setTimeout(() => {
        element.play().catch((err: unknown) => {
          console.error("Error playing video:", err);
        });
      }, 100);
    } catch (err) {
      console.error("Error starting video:", err);
    }
  };

  effect(() => {
    if (!visible.value) {
      stopVideo();
      return;
    }

    const element = videoElement.value;
    if (!element) return;

    void startVideo(element);

    return () => {
      stopVideo();
    };
  });

  const handleMouseMove = (e: { clientX: number; clientY: number }) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    position.value = {
      x: (initialPos.x as number) + dx,
      y: (initialPos.y as number) + dy,
    };
  };

  const handleMouseUp = () => {
    dragging = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  const handleMouseDown = (e: { clientX: number; clientY: number }) => {
    if (`${position.value.x}`.endsWith("w")) return;
    dragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    initialPos = { ...position.value };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const open = () => {
    visible.value = true;
  };

  const close = () => {
    visible.value = false;
    handleMouseUp();
    stopVideo();
  };

  const setOverlaySize = (size: PersonVideoOverlaySize) => {
    overlaySize.value = size;
  };

  const toggleFullscreen = () => {
    if (overlaySize.value === "full") {
      overlaySize.value = lastSizeBeforeFullScreen;
      position.value = { ...lastPosBeforeFullScreen };
      return;
    }

    setTimeout(() => {
      lastPosBeforeFullScreen = {
        x: position.value.x,
        y: position.value.y,
      };
      lastSizeBeforeFullScreen = overlaySize.value;
      overlaySize.value = "full";
      position.value = {
        x: "5dvw",
        y: "10dvh",
      };
    }, 50);
  };

  const handleCloseAndToggleLayout = () => {
    G.CloseVideoOverlay?.();
    G.ToggleVideoLayout?.(true);
  };

  const attachVideoElement = (element: HTMLVideoElement | null) => {
    videoElement.value = element;
  };

  return {
    visible,
    overlaySize,
    position,
    sizeOptions: SIZE_OPTIONS,
    open,
    close,
    setOverlaySize,
    toggleFullscreen,
    attachVideoElement,
    handleMouseDown,
    handleCloseAndToggleLayout,
  };
}
