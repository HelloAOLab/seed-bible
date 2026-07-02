import type { RecordVoiceManager } from "ext_discover.interfaces.managers.RecordVoiceManager";

export interface RecordVoiceExternal {
  data: any;
  setData: (value: any) => void;
  name: string;
  setName: (value: string) => void;
}

export interface RecordingUIProps extends RecordVoiceExternal {
  scope?: string;
  manager?: RecordVoiceManager;
}
