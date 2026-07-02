import type { Signal } from "@preact/signals";
import type { RecordVoiceExternal } from "ext_discover.interfaces.components.RecordVoice";

export interface RecordVoiceManager {
  isRecording: Signal<boolean>;
  isRecorded: Signal<boolean>;
  isPlaying: Signal<boolean>;
  playCount: Signal<number>;
  dataFreq: Signal<number[]>;
  syncExternal: (external: RecordVoiceExternal) => void;
  handleRecord: () => Promise<void>;
  handleStop: () => void;
  handleStopPlay: () => void;
  handlePlay: () => Promise<void>;
  handleReRecord: () => void;
}
