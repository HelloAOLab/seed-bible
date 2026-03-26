const { useState, useLayoutEffect, useRef, useMemo, useCallback } = os.appHooks;
const G = globalThis as any;
const videoGIF =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/a06426963e6f35751bdc3e76b49527f24cf646ff1ca48aaec66db6ee483f3f1c.gif";
const screenGIF =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/4762072e89002b10128fc5fd2378aab528e60776159734a56ab048f3f337ed1d.gif";

const IconsRef: Record<string, string> = {
  "screen&cam":
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/5ccb9e853b00fb860c2f5891d26f0960752606951a7aa65f834c9d456cd37b74.svg",
  "screen&cam_active":
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/082372063bb71655ac595d8ec562e1db62dce19a36bb9c84e4ae0a650701fcaf.svg",
  screen:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/cac667f563e65712a435b025ba07f17654754c19e088ff63a52cee5a604a17d0.svg",
  screen_active:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/3083c0ab7b70b79e1af836c500a3c797af134d60bd7cf951b2af3a34460bcb40.svg",
  cam: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/0eb6e9acab9162a66e56c02cfdd2276900dfc6ae806a34c728dbfa51438aec18.svg",
  cam_active:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/3c8826d5457ec79a1d3cf195e47d476a0e04fbee3886f6603a7da03cd6f7a267.svg",
  mic: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/982a9c30965db6345fc760cf381af0e976c3677e395d59acee8efe70691a5f8b.svg",
  mic_off:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/0da679456ed172e5d3573982e6140ca4549d215e3db610e0264d43a1ae1f72af.svg",
  start_recording:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/733bde47bbd9ed4abc94ddf6bdbe597db886a13b106d150ec7ab2a587856b2bd.svg",
  stop_recording:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/1975ce33ad8bee6f1c178167477fc356446715eda8f5bece9958755209297526.svg",
};

const VideoRecordUI = (props: any) => {
  const { data, setData } = props;
  const [recordingProps, setRecordingProps] = useState({
    audio: true,
    video: G?.VideoRecordTab ? G.VideoRecordTab !== "screen" : true,
    screen: G?.VideoRecordTab ? G.VideoRecordTab !== "cam" : true,
  });

  const isScreen = useMemo(
    () => recordingProps.screen,
    [recordingProps.screen]
  );

  const videoRef = useRef<any>(null);
  const [poster, setPoster] = useState<string | null | boolean>(false);
  const [isRecording, setIsRecording] = useState(!!G.isRecording);
  const [isRecorded, setIsRecorded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [tab, setTab] = useState(G.VideoRecordTab || "screen&cam");

  G.VideoRecordTab = tab;

  G.isRecording = isRecording;
  G.hasRecording = isRecorded;

  const handleRecord = async () => {
    try {
      setIsRecording(true);
      await experiment.beginRecording({
        audio: !recordingProps.audio
          ? false
          : recordingProps.screen
            ? ["microphone"]
            : true,
        video: !recordingProps.screen,
        screen: recordingProps.screen,
      });
      if (isScreen) {
        G.isRecording = true;
        thisBot.ShowScreenRecordingStopButton({ video: recordingProps.video });
        G.setTabPlaylist("discover");
      }
    } catch (err) {
      setIsRecording(false);
      ShowNotification({ message: err as string, severity: "error" });
    }
  };

  const handleStop = useCallback(async () => {
    const data: any = await experiment.endRecording();
    if (videoRef.current) {
      videoRef.current.srcObject
        ?.getTracks()
        .forEach((track: any) => track.stop());
      videoRef.current.srcObject = null;
    }
    thisBot.RemoveScreenRecordingControls();
    setIsStreaming(false);
    setData(data.files[0].data);
    setIsRecorded(true);
    setIsRecording(false);
  }, []);

  const handlePlay = async () => {
    const url = URL.createObjectURL(data);

    if (videoRef.current) {
      videoRef.current.srcObject = null; // Remove live stream
      videoRef.current.src = url;
      videoRef.current.play();
    }

    setIsPlaying(true);
  };

  const handleStopPlay = () => {
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  G.HandleStopPlayVideo = handleStopPlay;

  const handleReRecord = async () => {
    videoRef.current.pause();
    setPoster(null);
    videoRef.current.currentTime = 0;
    videoRef.current.src = null;
    videoRef.current.srcObject = null; // Remove live stream
    setData(null);
    setIsPlaying(false);
    setIsRecorded(false);
    if (!isScreen) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setIsStreaming(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        videoRef.current.play();
      }
    }
  };

  useLayoutEffect(() => {
    if (G.StopVideoRecording) {
      handleStop();
      G.StopVideoRecording = false;
      return;
    }
    G.isScreenRecording = false;
    (async () => {
      if (!isScreen && !G.hasRecording) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
          videoRef.current.play();
        }
      } else {
        if (videoRef.current) {
          videoRef.current.srcObject
            ?.getTracks()
            .forEach((track: any) => track.stop());
          videoRef.current.srcObject = null;
        }
        setIsStreaming(false);
      }
    })();
    return async () => {
      if (videoRef.current) {
        videoRef.current.srcObject
          ?.getTracks()
          .forEach((track: any) => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsStreaming(false);
      if (!isScreen) {
        await experiment.endRecording();
      } else {
        G.isScreenRecording = true;
      }
    };
  }, [isScreen]);

  const enterFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen(); // Safari
      } else if (videoRef.current.msRequestFullscreen) {
        videoRef.current.msRequestFullscreen(); // IE/Edge
      }
    }
  };

  const buttonConfigs = useMemo(
    () => [
      {
        label: "Screen & Cam",
        value: "screen&cam",
        onClick: () => {
          setRecordingProps((prev) => ({
            ...prev,
            video: true,
            screen: true,
          }));
          setTab("screen&cam");
        },
      },
      {
        label: "Screen Only",
        value: "screen",
        onClick: () => {
          setRecordingProps((prev) => ({
            ...prev,
            video: false,
            screen: true,
          }));
          setTab("screen");
        },
      },
      {
        label: "Cam Only",
        value: "cam",
        onClick: () => {
          setRecordingProps((prev) => ({
            ...prev,
            video: true,
            screen: false,
          }));
          setTab("cam");
        },
      },
    ],
    [setTab]
  );

  useLayoutEffect(() => {
    if (data) {
      // Create a local URL for the recorded Blob
      const blob = new Blob([data], { type: "video/webm" });
      const url = URL.createObjectURL(blob);

      // Create a temp video element to capture a frame
      const tempVideo = document.createElement("video");
      tempVideo.src = url;
      tempVideo.muted = true;
      tempVideo.currentTime = 0.5;

      const capture = () => {
        const canvas = document.createElement("canvas");
        canvas.width = tempVideo.videoWidth;
        canvas.height = tempVideo.videoHeight;
        const ctx: any = canvas.getContext("2d");
        ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
        const imageURL = canvas.toDataURL("image/png");
        setPoster(imageURL);
      };

      tempVideo.addEventListener("loadeddata", () => {
        tempVideo.currentTime = 0.5; // seek to 0.5s
      });

      tempVideo.addEventListener("seeked", capture);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [data]);

  useLayoutEffect(() => {
    G.HandleStop = handleStop;
    return () => {
      G.HandleStop = false;
    };
  }, [handleStop]);

  return (
    <>
      <style>{thisBot.tags["RecordingVoiceUI.css"]}</style>
      <div
        className="tabs-playlist"
        style={{ width: "100%", marginBottom: "0.5rem" }}
      >
        {buttonConfigs.map(({ label, onClick, value }) => {
          return (
            <div
              onClick={() => {
                onClick();
              }}
              style={{
                justifyContent: "center",
                width: `${100 / buttonConfigs.length}%`,
                fontSize: "12px",
                fontWeight: "400",
              }}
              className={`tabs-playlist-item ${value === tab ? "active" : ""}`}
            >
              <img
                className="img-icon"
                style={{ height: "20px" }}
                src={IconsRef[`${value}${value === tab ? "_active" : ""}`]}
              />
              <span class="hide-at-400">{label}</span>
            </div>
          );
        })}
      </div>
      <div className="media-recorder">
        {isRecording && isScreen ? null : (
          <div style={{ position: "relative" }}>
            {isRecording && isScreen && (
              <div className="label-video">
                <img src={isScreen ? screenGIF : videoGIF} alt="record" />
                <p>
                  {isScreen
                    ? t("yourScreenIsBeingRecorded")
                    : t("yourVideoIsBeingRecorded")}
                </p>
              </div>
            )}
            <video
              style={{ width: "100%" }}
              autoPlay
              muted={isStreaming}
              controls={isPlaying}
              ref={videoRef}
              playsInline
              poster={
                (poster as string) ||
                `https://dummyimage.com/640x480/000/fff&text=${isScreen ? "Screen+Preview" : "Camera+Preview"}`
              }
            />
            {!isRecorded && (
              <div className="controls-video">
                {!isRecording && (
                  <>
                    <p
                      className="pointer"
                      onClick={() =>
                        setRecordingProps((prev) => ({
                          ...prev,
                          audio: !prev.audio,
                        }))
                      }
                    >
                      <img
                        src={IconsRef[recordingProps.audio ? "mic" : "mic_off"]}
                        className="img-icon"
                        alt="mic"
                        style={{ height: "32px" }}
                      />
                    </p>
                    <p className="pointer" onClick={handleRecord}>
                      <img
                        src={IconsRef.start_recording}
                        className="img-icon"
                        alt="mic"
                        style={{ height: "32px" }}
                      />
                    </p>
                  </>
                )}
                {isRecording && (
                  <p className="pointer" onClick={handleStop}>
                    <img
                      src={IconsRef.stop_recording}
                      className="img-icon"
                      alt="mic"
                      style={{ height: "32px" }}
                    />
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        {isRecording && isScreen && (
          <div className="controls">
            <p className="pointer" onClick={handleStop}>
              <img
                src={IconsRef.stop_recording}
                className="img-icon"
                alt="mic"
                style={{ height: "32px" }}
              />
            </p>
          </div>
        )}
        {isRecorded && (
          <div className="controls">
            {isRecorded && !isPlaying && (
              <>
                <p className="mic-container">
                  <span
                    className="material-symbols-outlined unfollow icon"
                    onClick={handlePlay}
                  >
                    play_arrow
                  </span>
                </p>
                <p className="mic-container">
                  <span
                    className="material-symbols-outlined unfollow icon"
                    onClick={handleReRecord}
                  >
                    replay
                  </span>
                </p>
              </>
            )}
            {isPlaying && (
              <p className="mic-container">
                <span
                  className="material-symbols-outlined unfollow icon"
                  onClick={handleStopPlay}
                >
                  stop
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
};

return VideoRecordUI;
