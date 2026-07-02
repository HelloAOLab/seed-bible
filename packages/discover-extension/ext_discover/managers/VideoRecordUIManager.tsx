import { computed, effect, signal } from "@preact/signals";
import { CloseSelf } from "ext_discover.helper.CloseSelf";
import { RemoveScreenRecordingControls } from "ext_discover.helper.RemoveScreenRecordingControls";
import { showScreenRecordingStopButton } from "ext_discover.helper.showScreenRecordingStopButton";
import { DEFAULT_VIDEO_RECORDING_PROPS } from "ext_discover.models.videoRecordUI";
import type { RecordVoiceExternal } from "ext_discover.interfaces.components.RecordVoice";
import type {
  VideoRecordTabConfig,
  VideoRecordUIManager,
} from "ext_discover.interfaces.managers.VideoRecordUIManager";

const G = globalThis as Record<string, any>;

const managersByScope = new Map<string, VideoRecordUIManager>();

export function getVideoRecordUIManager(scope: string): VideoRecordUIManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createVideoRecordUIManager();
  managersByScope.set(scope, manager);
  return manager;
}

export function createVideoRecordUIManager(): VideoRecordUIManager {
  const recordingProps = signal(DEFAULT_VIDEO_RECORDING_PROPS(G));
  const poster = signal<string | null | boolean>(false);
  const isRecording = signal(!!G.isRecording);
  const isRecorded = signal(G.hasRecording || false);
  const isPlaying = signal(false);
  const isStreaming = signal(false);
  const tab = signal(G.VideoRecordTab || "screen&cam");
  const data = signal<any>(null);
  let videoElement: HTMLVideoElement | null = null;
  let externalName = "";
  let setDataFn: (value: any) => void = () => {};
  let setNameFn: (value: string) => void = () => {};

  const isScreen = computed(() => recordingProps.value.screen);

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

  const setVideoRef = (element: HTMLVideoElement | null) => {
    videoElement = element;
  };

  const stopVideoTracks = () => {
    if (videoElement) {
      videoElement.srcObject
        ?.getTracks()
        .forEach((track: MediaStreamTrack) => track.stop());
      videoElement.srcObject = null;
    }
  };

  const handleStop = async () => {
    const recordingData: any = await experiment.endRecording();
    stopVideoTracks();
    RemoveScreenRecordingControls();
    isStreaming.value = false;
    setDataFn(recordingData.files[0].data);
    isRecorded.value = true;
    isRecording.value = false;
  };

  const handleRecord = async () => {
    try {
      isRecording.value = true;
      const props = recordingProps.value;
      await experiment.beginRecording({
        audio: !props.audio ? false : props.screen ? ["microphone"] : true,
        video: !props.screen,
        screen: props.screen,
      });
      if (isScreen.value) {
        G.isRecording = true;
        showScreenRecordingStopButton({ video: props.video });
        CloseSelf({ force: true });
      }
    } catch (err) {
      isRecording.value = false;
      ShowNotification({ message: err as string, severity: "error" });
    }
  };

  const handlePlay = async () => {
    const url = URL.createObjectURL(data.value);

    if (videoElement) {
      videoElement.srcObject = null;
      videoElement.src = url;
      videoElement.play();
    }

    isPlaying.value = true;
  };

  const handleStopPlay = () => {
    if (videoElement) {
      videoElement.pause();
      videoElement.currentTime = 0;
    }
    isPlaying.value = false;
  };

  G.HandleStopPlayVideo = handleStopPlay;

  const handleReRecord = async () => {
    if (G.IsSavingAndAdding) {
      return ShowNotification({
        message: t(
          "yourRecordingIsBeingSavedAndAddedToTheAnnotationPleaseWait"
        ),
        severity: "error",
      });
    }
    if (videoElement) {
      videoElement.pause();
      videoElement.currentTime = 0;
      videoElement.src = "";
      videoElement.srcObject = null;
    }
    poster.value = null;
    setDataFn(null);
    isPlaying.value = false;
    if (externalName?.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
      setNameFn("");
    }
    isRecorded.value = false;
    if (!isScreen.value) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      isStreaming.value = true;
      if (videoElement) {
        videoElement.srcObject = stream;
        isStreaming.value = true;
        videoElement.play();
      }
    }
  };

  const setTabScreenCam = () => {
    recordingProps.value = {
      ...recordingProps.value,
      video: true,
      screen: true,
    };
    tab.value = "screen&cam";
  };

  const setTabScreenOnly = () => {
    recordingProps.value = {
      ...recordingProps.value,
      video: false,
      screen: true,
    };
    tab.value = "screen";
  };

  const setTabCamOnly = () => {
    recordingProps.value = {
      ...recordingProps.value,
      video: true,
      screen: false,
    };
    tab.value = "cam";
  };

  const buttonConfigs = computed<VideoRecordTabConfig[]>(() => [
    {
      label: "Screen & Cam",
      value: "screen&cam",
      onClick: setTabScreenCam,
    },
    {
      label: "Screen Only",
      value: "screen",
      onClick: setTabScreenOnly,
    },
    {
      label: "Cam Only",
      value: "cam",
      onClick: setTabCamOnly,
    },
  ]);

  const toggleAudio = () => {
    recordingProps.value = {
      ...recordingProps.value,
      audio: !recordingProps.value.audio,
    };
  };

  effect(() => {
    G.VideoRecordTab = tab.value;
    G.isRecording = isRecording.value;
    G.hasRecording = isRecorded.value;
  });

  effect(() => {
    const screen = isScreen.value;

    if (G.StopVideoRecording) {
      void handleStop();
      G.StopVideoRecording = false;
      return;
    }
    G.isScreenRecording = false;

    void (async () => {
      if (!screen && !G.hasRecording) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (videoElement) {
          videoElement.srcObject = stream;
          isStreaming.value = true;
          videoElement.play();
        }
      } else {
        stopVideoTracks();
        isStreaming.value = false;
      }
    })();

    return () => {
      stopVideoTracks();
      isStreaming.value = false;
      void (async () => {
        if (!screen) {
          await experiment.endRecording();
          G.isRecording = false;
        } else {
          G.isScreenRecording = true;
        }
      })();
    };
  });

  effect(() => {
    const blobData = data.value;
    if (!blobData) {
      return;
    }

    const blob = new Blob([blobData], { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const tempVideo = document.createElement("video");
    tempVideo.src = url;
    tempVideo.muted = true;
    tempVideo.currentTime = 0.5;

    const capture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = tempVideo.videoWidth;
      canvas.height = tempVideo.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
      const imageURL = canvas.toDataURL("image/png");
      poster.value = imageURL;
    };

    const onLoadedData = () => {
      tempVideo.currentTime = 0.5;
    };

    tempVideo.addEventListener("loadeddata", onLoadedData);
    tempVideo.addEventListener("seeked", capture);

    return () => {
      tempVideo.removeEventListener("loadeddata", onLoadedData);
      tempVideo.removeEventListener("seeked", capture);
      URL.revokeObjectURL(url);
    };
  });

  effect(() => {
    G.HandleStop = handleStop;
    return () => {
      G.HandleStop = false;
    };
  });

  return {
    recordingProps,
    poster,
    isRecording,
    isRecorded,
    isPlaying,
    isStreaming,
    tab,
    isScreen,
    buttonConfigs,
    syncExternal,
    setVideoRef,
    toggleAudio,
    handleRecord,
    handleStop,
    handlePlay,
    handleStopPlay,
    handleReRecord,
  };
}
