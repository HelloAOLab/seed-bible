const { currentPlaylistName, nextItem, parentId, currentItem } = that;
const G = globalThis as any;

const { useState, useLayoutEffect } = os.appHooks;

const MobilePlaylistToggleButton = await thisBot.MobilePlaylistToggleButton();

const HeaderComponent = () => {
  const [isCurrentVisible, setIsCurrentVisible] = useState(true);

  useLayoutEffect(() => {
    setTimeout(() => {
      setIsCurrentVisible(false);
    }, 4000);
  }, []);

  return (
    <div className="playlist-header" style={{ paddingLeft: "1rem" }}>
      <div className="playlist-header-left">
        <p className="playlist-header-title">{currentPlaylistName}</p>
        <div className="playlist-header-next-current">
          <p
            className={`playlist-header-next ${isCurrentVisible ? "hide" : ""}`}
          >
            {nextItem?.content ? "Next:" : "Playlist Ended"}{" "}
            <span className="playlist-header-next-item">
              {G.GetTruncatedPlaylistLabel(nextItem, 16)}
            </span>
          </p>
          <p
            className={`playlist-header-current ${isCurrentVisible ? "" : "hide"}`}
          >
            {currentItem?.content ? "Current:" : "Checklist Mode"}{" "}
            <span className="playlist-header-next-item">
              {G.GetTruncatedPlaylistLabel(currentItem, 9)}
            </span>
          </p>
        </div>
      </div>
      <div className="playlist-header-right">
        <MobilePlaylistToggleButton parentId={parentId} />
        <span
          className="material-symbols-outlined"
          onClick={() => thisBot.StopPlayingPlaylist()}
        >
          close
        </span>
      </div>
    </div>
  );
};

G.SetMobileHeaderBar(<HeaderComponent />);
