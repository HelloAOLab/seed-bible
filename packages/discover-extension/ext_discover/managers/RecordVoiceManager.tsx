import { effect, signal } from "@preact/signals";
import { getAudioSeconds } from "ext_discover.helper.getAudioSeconds";
import { RECORDING_LIMIT_OF_LINES } from "ext_discover.models.recordVoice";
import type { RecordVoiceExternal } from "ext_discover.interfaces.components.RecordVoice";
import type { RecordVoiceManager } from "ext_discover.interfaces.managers.RecordVoiceManager";

const G = globalThis as Record<string, any>;

const managersByScope = new Map<string, RecordVoiceManager>();

export function getRecordVoiceManager(scope: string): RecordVoiceManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createRecordVoiceManager();
  managersByScope.set(scope, manager);
  return manager;
}

export function createRecordVoiceManager(): RecordVoiceManager {
  const isRecording = signal(G.isRecording || false);
  const isRecorded = signal(G.hasRecording || false);
  const isPlaying = signal(false);
  const playCount = signal(0);
  const dataFreq = signal<number[]>(G.dataFreq || []);
  const data = signal<any>(null);
  let incrementCount = 0;
  let externalName = "";
  let setDataFn: (value: any) => void = () => {};
  let setNameFn: (value: string) => void = () => {};

  const syncExternal = ({
    data: nextData,
    setData,
    name,
    setName,
  }: RecordVoiceExternal) => {
    if (data.value !== nextData) {
      data.value = nextData;
    }
    setDataFn = setData;
    externalName = name;
    setNameFn = setName;
  };

  effect(() => {
    G.isRecording = isRecording.value;
    G.hasRecording = isRecorded.value;
    G.dataFreq = dataFreq.value;
  });

  effect(() => {
    const blob = data.value;
    void (async () => {
      const val = await getAudioSeconds({ blob });
      incrementCount = RECORDING_LIMIT_OF_LINES / Math.ceil(val);
    })();
  });

  effect(() => {
    const playing = isPlaying.value;
    const count = playCount.value;
    const recording = isRecording.value;

    let timer: ReturnType<typeof setTimeout> | null = null;

    if (playing) {
      if (count === 0) {
        playCount.value = count + incrementCount;
      }
      timer = setTimeout(() => {
        if (playCount.value >= RECORDING_LIMIT_OF_LINES) {
          setTimeout(() => {
            playCount.value = 0;
            isPlaying.value = false;
          }, 1000);
          return;
        }
        playCount.value = playCount.value + incrementCount;
      }, 1000);
    }

    return () => {
      if (recording) DataManager.endVoiceRecord();
      G.isRecording = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  });

  const handleRecord = async () => {
    isRecording.value = true;
    isRecorded.value = false;
    isPlaying.value = false;
    DataManager.recordVoice();
  };

  const handleStop = () => {
    isRecording.value = false;
    dataFreq.value = new Array(RECORDING_LIMIT_OF_LINES)
      .fill(0)
      .map(() => Math.random() * 70 + 20);
    isRecorded.value = true;
    DataManager.endVoiceRecord({ setData: setDataFn });
  };

  const handleStopPlay = () => {
    isPlaying.value = false;
    playCount.value = 0;
    DataManager.cancelCurrentPlayingSound();
  };

  G.HandleStopPlayVoice = handleStopPlay;

  const handlePlay = async () => {
    await DataManager.playSound({ data: data.value });
    playCount.value = 0;
    isPlaying.value = true;
  };

  const handleReRecord = () => {
    if (G.IsSavingAndAdding) {
      return ShowNotification({
        message: t(
          "yourRecordingIsBeingSavedAndAddedToTheAnnotationPleaseWait"
        ),
        severity: "error",
      });
    }
    if (externalName?.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
      setNameFn("");
    }
    setDataFn(null);
    isRecorded.value = false;
    isPlaying.value = false;
  };

  return {
    isRecording,
    isRecorded,
    isPlaying,
    playCount,
    dataFreq,
    syncExternal,
    handleRecord,
    handleStop,
    handleStopPlay,
    handlePlay,
    handleReRecord,
  };
}
