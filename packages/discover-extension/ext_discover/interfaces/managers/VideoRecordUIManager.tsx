import type { Signal } from "@preact/signals";
import type { RecordVoiceExternal } from "ext_discover.interfaces.components.RecordVoice";
import type { VideoRecordingProps } from "ext_discover.models.videoRecordUI";

export interface VideoRecordTabConfig {
  label: string;
  value: string;
  onClick: () => void;
}

export interface VideoRecordUIManager {
  recordingProps: Signal<VideoRecordingProps>;
  poster: Signal<string | null | boolean>;
  isRecording: Signal<boolean>;
  isRecorded: Signal<boolean>;
  isPlaying: Signal<boolean>;
  isStreaming: Signal<boolean>;
  tab: Signal<string>;
  isScreen: Signal<boolean>;
  buttonConfigs: Signal<VideoRecordTabConfig[]>;
  syncExternal: (external: RecordVoiceExternal) => void;
  setVideoRef: (element: HTMLVideoElement | null) => void;
  toggleAudio: () => void;
  handleRecord: () => Promise<void>;
  handleStop: () => Promise<void>;
  handlePlay: () => Promise<void>;
  handleStopPlay: () => void;
  handleReRecord: () => Promise<void>;
}
