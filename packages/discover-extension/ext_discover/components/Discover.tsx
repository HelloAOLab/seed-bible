import { getDiscoverChips } from "ext_discover.hooks.getDiscoverChips";
import { getDiscoverManager } from "ext_discover.managers.DiscoverManager";
import { PlaylistContainer } from "ext_discover.components.PlaylistContainer";
import { AnnotationList } from "ext_discover.components.AnnotationList";
import type { DiscoverProps } from "ext_discover.interfaces.components.Discover";
import { Input } from "ext_discover.features.components.Input";

const G = globalThis as Record<string, any>;

export function Discover({
  discover = getDiscoverManager(),
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
}: DiscoverProps) {
  const IsPlaylistPlaying = G.IsPlaylistPlaying;
  const chips = getDiscoverChips();
  const selectedChip = discover.selectedChip.value;
  const isAll = selectedChip.All;

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
            value={discover.query.value}
            onChangeListener={(text: string) => discover.setQuery(text)}
            placeholder="Search..."
          />
        </div>
      )}
      {!editingPlaylist && (
        <div className="align-center chips-tag-container">
          {false && (
            <div
              className="chip-tag"
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
              style={{
                width: "100%",
                paddingRight: discover.showRightArrow.value ? "2rem" : "0",
                paddingLeft: discover.showLeftArrow.value ? "2rem" : "0",
              }}
              ref={(el) => discover.setScrollElement(el)}
            >
              {chips.map((chip) => (
                <div
                  key={chip.label}
                  onClick={() => discover.selectChip(chip.label)}
                  className={`chip-tag ${selectedChip[chip.label] ? "active" : ""}`}
                >
                  {t(chip.key)}
                </div>
              ))}
            </div>
            {discover.showLeftArrow.value && (
              <div
                className="chip-tag arrow left"
                onClick={discover.scrollLeftByWidth}
              >
                <span class="material-symbols-outlined">chevron_backward</span>
              </div>
            )}
            {discover.showRightArrow.value && (
              <div
                className="chip-tag arrow right"
                onClick={discover.scrollRightByWidth}
              >
                <span class="material-symbols-outlined color-inverted">
                  chevron_forward
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {(isAll ||
        playingPlaylist ||
        selectedChip.Playlist ||
        selectedChip.Shared) && (
        <PlaylistContainer
          selectedChip={selectedChip}
          query={discover.query.value}
          setOpenModal={setOpenModal}
          active={true}
          playingPlaylist={playingPlaylist}
          id="default"
        />
      )}

      {!editingPlaylist &&
        !discover.renamingPlaylist.value &&
        DEV_ENV &&
        (isAll || selectedChip.Annotations) && (
          <AnnotationList
            isPlayingPlaylist={IsPlaylistPlaying}
            annotationSources={annotationSources}
            setAnnotationData={setAnnotationData}
            tagsSources={tagsSources}
            currentOpenedBook={currentOpenedBook}
            fetchingAnnotation={fetchingAnnotation}
            chapter={chapter}
            annotationData={annotationData}
          />
        )}
      <div
        className={`mobile-pseudogap-element ${
          IsPlaylistPlaying ? "playing-playlist" : ""
        }`}
      />
    </div>
  );
}
