const { useState, useRef, useLayoutEffect } = os.appHooks;

const { Input } = Components;



const PlaylistCont = await thisBot.PlaylistContainer();
const AnnotationList = await thisBot.AnnotationList();
const Bookmarks = await thisBot.Bookmarks();

const itemKeys = [
  "all",
  "pinnedItems",
  "shared",
  "playlist",
  "annotations",
  "bookmarks",
];

const items = [
  "All",
  "Pinned Items",
  "Shared",
  "Playlist",
  "Annotations",
  "Bookmarks",
];

const Discover = ({
  currentOpenedBook,
  setAnnotationData,
  chapter,
  fetchingAnnotation,
  playingPlaylist,
  editingPlaylist,
  annotationData,
  style,
  setOpenModal,
  annotationSources,
  tagsSources,
}) => {
  
  const IsPlaylistPlaying = globalThis.IsPlaylistPlaying;

  const [selectedChip, setSelectedChip] = useState({
    All: true,
  });
  const [query, setQuery] = useState("");

  const [renamingPlaylist, setRenamingPlaylist] = useState(false);

  useLayoutEffect(() => {
    globalThis.SetRenamingPlaylist = setRenamingPlaylist;
    return () => {
      globalThis.SetRenamingPlaylist = null;
    };
  }, [renamingPlaylist]);

  const scrollRef = useRef(null);

  const [pos, setPos] = useState("left");

  const checkPosition = () => {
    const el = scrollRef.current;
    if (!el) return;

    // ✅ Detect if no scroll exists
    if (el.scrollWidth <= el.clientWidth) {
      setPos("noscroll");
      return;
    }

    const scrollLeft = el.scrollLeft;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;

    if (scrollLeft <= 20) {
      setPos("left");
    } else if (scrollLeft >= maxScrollLeft - 20) {
      // Use -1 for tiny rounding error
      setPos("right");
    } else {
      setPos("mid");
    }
  };

  const scrollLeftByWidth = () => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth - 50;

    el.scrollBy({
      left: -scrollAmount,
      behavior: "smooth",
    });
  };

  const scrollRightByWidth = () => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth - 50;

    el.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    });
  };

  const isAll = selectedChip["All"];

  useLayoutEffect(() => {
    const interval = setInterval(() => {
      checkPosition();
    }, 100);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const selectSelectedChip = (val) => {
    if (val === "All") {
      setSelectedChip((prev) => ({
        [val]: !prev[val],
      }));
    } else {
      setSelectedChip((prev) => {
        const newSelectedChip:any = { ...prev };

        if (newSelectedChip[val]) {
          delete newSelectedChip[val];
        } else {
          newSelectedChip[val] = true;
        }

        if (Object.keys(newSelectedChip).length === 0 || (Object.keys(newSelectedChip)[0] === "All") && Object.keys(newSelectedChip).length === 1) {
          newSelectedChip.All = true;
        } else {
          delete newSelectedChip.All;
        }

        return newSelectedChip;
      });
    }
  };

  return (
    <div
      style={{
        width: "100%",
        padding: "0 0.5rem",
        overflow: "auto",
        ...style,
      }}
      id="discover-container"
    >
      {!editingPlaylist && false && (
        <div
          className="align-center"
          style={{
            gap: "0.5rem",
            padding: "1rem 0",
            marginBottom: "1rem",
            borderBottom: "1px solid #CCCCCD",
          }}
        >
          <div className="content-type">
            <img
              alt="sources"
              src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/c7bc8e3ba8c55d2dd8c2ab338bcb312c7e3757f41fc62985d9d2f229faf0960b.svg"
            />
            <p>Sources</p>
          </div>
          <div className="content-type secondary">
            <img
              alt="sources"
              src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/b4f14faaa7a25bd6e3541b18f93c82f773900c7bbd8687fda7cef3d2d38f2ce2.svg"
            />
            <p>Content</p>
          </div>
          <Input
            icon="search"
            style={{
              marginBottom: "0",
            }}
            value={query}
            onChangeListener={(text) => setQuery(text)}
            placeholder="Search..."
          />
        </div>
      )}
      {!editingPlaylist && (
        <div className="align-center chips-tag-container">
          {false && (
            <div
              onClick={() => selectSelectedChip(ele)}
              className={`chip-tag`}
              style={{ display: "flex", alignItems: "center" }}
            >
              <span>Chapter</span>
              <span class="material-symbols-outlined">keyboard_arrow_down</span>
            </div>
          )}
          <div
            className="align-center chips-tag-container"
            style={{ flexGrow: "1", padding: "0.5rem 0" }}
          >
            <div
              className="align-center chips-tag-container"
              style={{ width: "100%" }}
              ref={scrollRef}
            >
              {items.map((ele, index) => {
                return (
                  <div
                    onClick={() => selectSelectedChip(ele)}
                    className={`chip-tag ${selectedChip[ele] ? "active" : ""}`}
                  >
                    {t(itemKeys[index])}
                  </div>
                );
              })}
            </div>
            {pos !== "left" && pos !== "noscroll" && (
              <div className="chip-tag arrow left" 
                onClick={scrollLeftByWidth}
              >
                <span class="material-symbols-outlined">chevron_backward</span>
              </div>
            )}
            {pos !== "right" && pos !== "noscroll" && (
              <div
                className="chip-tag arrow right"
                onClick={scrollRightByWidth}
              >
                <span class="material-symbols-outlined color-inverted">chevron_forward</span>
              </div>
            )}
          </div>
        </div>
      )}

      {isAll ||
      playingPlaylist ||
      selectedChip["Playlist"] ||
      selectedChip["Shared"] ? (
        <PlaylistCont
          selectedChip={selectedChip}
          query={query}
          setOpenModal={setOpenModal}
          active={true}
          playingPlaylist={playingPlaylist}
          id="default"
        />
      ) : null}

      {!editingPlaylist &&
      !renamingPlaylist &&
      (isAll || selectedChip["Annotations"]) ? (
        <AnnotationList
          annotationSources={annotationSources}
          setAnnotationData={setAnnotationData}
          tagsSources={tagsSources}
          currentOpenedBook={currentOpenedBook}
          fetchingAnnotation={fetchingAnnotation}
          chapter={chapter}
          annotationData={annotationData}
        />
      ) : null}

      {!editingPlaylist &&
      !renamingPlaylist &&
      (isAll || selectedChip["Bookmarks"]) ? (
        <Bookmarks />
      ) : null}
      <div
        className={`mobile-pseudogap-element ${
          IsPlaylistPlaying ? "playing-playlist" : ""
        }`}
      />
    </div>
  );
};

return Discover;
