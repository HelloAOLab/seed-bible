os.unregisterApp("merge-modal");
os.registerApp("merge-modal", thisBot);

const { useState } = os.appHooks;
const G = globalThis as any;
const id = that.id;
const parentId = that.parentId || "default";
const { Modal, Button, ButtonsCover, Select } = G.Components;
const PlaylistFiltered = G[`${parentId}playlists`].filter(
  (playlist: any) => playlist.id !== id
);

const MergeModal = () => {
  const [selected, setSelected] = useState("");

  const onClose = () => {
    os.unregisterApp("merge-modal");
  };

  return (
    <Modal showIcon={false} title="Merge Playlist" onClose={onClose}>
      <p style={{ fontSize: "12px" }}>
        <b>Select Playlist to Merge Into:</b>
      </p>
      {PlaylistFiltered.map((ele: any) => {
        return (
          <div
            style={{ display: "flex", cursor: "pointer", alignItems: "center" }}
            onClick={() => setSelected(ele.id)}
          >
            <input
              style={{ marginRight: "10px" }}
              type="radio"
              checked={selected === ele.id}
            />
            <h4
              className="playlist-action"
              style={{ display: "flex", alignItems: "center" }}
            >
              <b>{ele.name}</b>
            </h4>
          </div>
        );
      })}
      <ButtonsCover>
        <Button onClick={onClose} secondaryAlt>
          Close
        </Button>

        <Button
          secondary
          isDisabled={!selected.trim()}
          onClick={() => {
            const dragItemIndex = G.playlists.findIndex(
              ({ id: itemID }: any) => itemID === id
            );
            const dragOverItemIndex = G.playlists.findIndex(
              ({ id }: any) => id === selected
            );
            G.SetPlaylists &&
              G.SetPlaylists((prev: any) => {
                const old = [...prev];
                const oldItem = old[dragItemIndex];
                old[dragOverItemIndex].list.push({
                  type: "playlist",
                  ...oldItem,
                });
                old[dragOverItemIndex].nesting += 1;
                old.splice(dragItemIndex, 1);
                return old;
              });
            onClose();
          }}
        >
          ↬↫ Merge
        </Button>
      </ButtonsCover>
    </Modal>
  );
};

os.compileApp("merge-modal", <MergeModal />);
