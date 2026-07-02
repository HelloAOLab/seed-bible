import type { RecordVoiceExternal } from "ext_discover.interfaces.components.RecordVoice";
import type { VideoRecordUIManager } from "ext_discover.interfaces.managers.VideoRecordUIManager";

export interface VideoRecordUIProps extends RecordVoiceExternal {
  isScreen?: boolean;
  scope?: string;
  manager?: VideoRecordUIManager;
}
