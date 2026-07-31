const { useRef } = os.appHooks;
const G = globalThis as any;

const VideoSmallScreen = (props: any) => {
  const { videoSrc, playlistItem } = props;

  const videoRef = useRef<any>(null);

  if (!videoSrc) return;

  return (
    <>
      <style>
        {`
                    .icon {
                        cursor: pointer;
                        color: white;
                    }

                    .icon:hover {
                        color: var(--secondaryColor);
                    }

                `}
      </style>
      <div style={{ width: "100%", position: "relative" }}>
        <video
          controls
          autoPlay
          ref={videoRef}
          src={videoSrc}
          style={{ width: "100%", height: "auto" }}
        />
        <p
          className="mic-container"
          style={{
            position: "absolute",
            bottom: "1.5rem",
            right: "4rem",
            zIndex: "100000",
            backgroundColor: "transparent",
          }}
        >
          <span
            className="material-symbols-outlined unfollow icon"
            style={{ fontSize: "1rem" }}
            onClick={() => {
              DataManager.cancelCurrentPlayingSound();
              videoRef.current?.pause();
              videoRef.current?.removeAttribute("src");

              G.SmallPlaybackContent = () => {
                videoRef.current.autoplay = false;
                videoRef.current?.setAttribute("src", videoSrc);
              };

              thisBot.RenderLinkContent({
                ...playlistItem,
                skipEmbed: true,
                isLastItem: false,
                isFirstItem: false,
              });
            }}
          >
            fullscreen
          </span>
        </p>
        <p
          className="mic-container"
          style={{
            position: "absolute",
            top: "0.5rem",
            right: "0.5rem",
            zIndex: "100000",
            backgroundColor: "transparent",
          }}
        >
          <span
            className="material-symbols-outlined unfollow icon"
            style={{ fontSize: "1.5rem", textShadow: "0px 4px 2px black" }}
            onClick={() => {
              G.SetVideoSrc(null);
            }}
          >
            close
          </span>
        </p>
      </div>
    </>
  );
};
return VideoSmallScreen;
