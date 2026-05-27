const { useState } = os.appHooks;
const VideoPlayer = await thisBot.VideoSmallScreen();
const AudioPlayer = await thisBot.AudioPlayer();
const G = globalThis as any;
const ShowPlayingContentAnnotation = () => {
  // Audio
  const [mediaURL, setMediaURL] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState(false);
  const [currentItem, setCurrentItem] = useState({});

  G.SetVideoSrc = (val: any) => {
    setMediaURL(null as any);
    setVideoSrc(val);
  };
  G.SetMediaURL = (val: any) => {
    setVideoSrc(null as any);
    setMediaURL(val);
  };
  G.SetCurrentItem = setCurrentItem;

  if (!currentItem) return null;

  return (
    <div
      style={{
        position: "relative",
        backgroundColor: "white",
        padding: "0 0.5rem",
        width: "calc(100% - 10px)",
      }}
    >
      {videoSrc ? (
        <VideoPlayer videoSrc={videoSrc} playlistItem={{ ...currentItem }} />
      ) : mediaURL ? (
        <AudioPlayer
          close
          secondaryClose
          mediaURL={mediaURL}
          fileName={fileName}
        />
      ) : null}
    </div>
  );
};

return ShowPlayingContentAnnotation;
