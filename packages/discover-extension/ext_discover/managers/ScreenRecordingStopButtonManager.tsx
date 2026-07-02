import { signal } from "@preact/signals";
import { openSelf } from "ext_discover.helper.openSelf";
import type { ScreenRecordingStopButtonManager } from "ext_discover.interfaces.managers.ScreenRecordingStopButtonManager";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

let singleton: ScreenRecordingStopButtonManager | undefined;

export function getScreenRecordingStopButtonManager(): ScreenRecordingStopButtonManager {
  if (!singleton) {
    singleton = createScreenRecordingStopButtonManager();
  }
  return singleton;
}

export function createScreenRecordingStopButtonManager(): ScreenRecordingStopButtonManager {
  const hidden = signal(false);
  const video = signal(false);
  const position = signal<{ x: number | string; y: number | string }>({
    x: window.innerWidth / 2 - 90,
    y: 32,
  });

  let dragging = false;
  let dragStart = { x: 0, y: 0 };
  let initialPos = { x: 0, y: 0 };

  const toggleVideo = () => {
    if (!video.value) {
      G.OpenVideoOverlay?.();
    } else {
      G.CloseVideoOverlay?.();
    }
    video.value = !video.value;
  };

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

  const cleanup = () => {
    G.ToggleVideoLayout = undefined;
    G.CloseVideoOverlay?.();
    handleMouseUp();
  };

  const init = (opts?: { video?: boolean }) => {
    hidden.value = false;
    video.value = !!opts?.video;
    position.value = {
      x: window.innerWidth / 2 - 90,
      y: 32,
    };
    G.ToggleVideoLayout = toggleVideo;
    if (G.OpenVideoOverlay && video.value) {
      G.OpenVideoOverlay();
    }
  };

  const handleStop = () => {
    if (G.HandleStop) {
      G.HandleStop();
      return;
    }
    G.StopVideoRecording = true;
    void openSelf({ force: true });
  };

  const hidePanel = () => {
    hidden.value = true;
  };

  return {
    hidden,
    video,
    position,
    init,
    cleanup,
    toggleVideo,
    handleStop,
    hide: hidePanel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
