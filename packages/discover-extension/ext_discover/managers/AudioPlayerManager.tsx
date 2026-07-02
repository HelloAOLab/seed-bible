import { effect, signal } from "@preact/signals";
import { getAudioSeconds } from "ext_discover.helper.getAudioSeconds";
import { RECORDING_LIMIT_OF_LINES } from "ext_discover.models.recordVoice";
import type {
  AudioPlayerExternal,
  AudioPlayerManager,
} from "ext_discover.interfaces.managers.AudioPlayerManager";

const G = globalThis as Record<string, any>;

const managersByScope = new Map<string, AudioPlayerManager>();

export function getAudioPlayerManager(scope: string): AudioPlayerManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createAudioPlayerManager();
  managersByScope.set(scope, manager);
  return manager;
}

export function createAudioPlayerManager(): AudioPlayerManager {
  const loading = signal(true);
  const isRecorded = signal(false);
  const playCount = signal(0);
  const isPlaying = signal(false);
  const currentSeconds = signal(0);
  const audioLength = signal(0);
  const dataFreq = signal<number[]>(
    new Array(RECORDING_LIMIT_OF_LINES)
      .fill(0)
      .map(() => Math.random() * 70 + 20)
  );
  const mediaURL = signal<string | undefined>(undefined);
  let blobMp3Data = "";
  let incrementCount = 0;
  let initializedForUrl: string | undefined;

  const syncExternal = (external: AudioPlayerExternal) => {
    if (mediaURL.value !== external.mediaURL) {
      mediaURL.value = external.mediaURL;
    }
  };

  const loadMedia = async (url?: string) => {
    if (!url) {
      loading.value = false;
      return;
    }
    if (initializedForUrl === url) {
      return;
    }
    initializedForUrl = url;
    loading.value = true;
    try {
      const data = await web.get(url);
      const val = await getAudioSeconds({ blob: data.data });
      blobMp3Data = data.data;
      audioLength.value = val;
      incrementCount = RECORDING_LIMIT_OF_LINES / Math.ceil(val);
      isRecorded.value = true;
      loading.value = false;
      isPlaying.value = true;
      await DataManager.playSound({ data: data.data });
    } catch {
      ShowNotification({
        message: `Failed to fetch notification!`,
        severity: "error",
      });
      isRecorded.value = true;
      loading.value = false;
      isPlaying.value = true;
    }
  };

  effect(() => {
    void loadMedia(mediaURL.value);
  });

  effect(() => {
    const playing = isPlaying.value;
    const count = playCount.value;

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
        currentSeconds.value += 1;
        playCount.value = playCount.value + incrementCount;
      }, 1000);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  });

  const handleStopPlay = async () => {
    await DataManager.cancelCurrentPlayingSound();
    isPlaying.value = false;
    playCount.value = 0;
  };

  const handlePlay = async () => {
    await DataManager.playSound({ data: blobMp3Data });
    playCount.value = 0;
    isPlaying.value = true;
  };

  const handleClose = () => {
    DataManager.cancelCurrentPlayingSound();
    G.SetMediaURL(null);
  };

  return {
    loading,
    isRecorded,
    playCount,
    isPlaying,
    currentSeconds,
    audioLength,
    dataFreq,
    syncExternal,
    handleStopPlay,
    handlePlay,
    handleClose,
  };
}
