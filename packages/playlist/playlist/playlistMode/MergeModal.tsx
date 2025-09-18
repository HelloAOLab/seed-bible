os.unregisterApp("merge-modal");
os.registerApp("merge-modal");

const { useState } = os.appHooks;
const id = that.id;
const parentId = that.parentId || "default";
const { Modal, Button, ButtonsCover, Select } = Components;
const PlaylistFiltered = globalThis[`${parentId}playlists`].filter(playlist => playlist.id !== id);

const MergeModal = () => {

    const [selected, setSelected] = useState("");

    const onClose = () => {
        os.unregisterApp("merge-modal");
    }

    return <Modal showIcon={false} title="Merge Playlist" onClose={onClose} >
        <p style={{ fontSize: '12px' }} ><b>Select Playlist to Merge Into:</b></p>
        {PlaylistFiltered.map(ele => {
            return <div style={{ display: "flex", cursor: "pointer", alignItems: "center" }} onClick={() => setSelected(ele.id)} >
                <input style={{ marginRight: "10px" }} type="radio" checked={selected === ele.id} />
                <h4
                    className="playlist-action" style={{ display: "flex", alignItems: 'center' }} >
                    <b>{ele.name}</b>
                </h4>
            </div>
        })}
        <ButtonsCover>
            <Button onClick={onClose} secondaryAlt>
                Close
            </Button>

            <Button
                secondary
                isDisabled={!selected.trim()}
                onClick={() => {
                    const dragItemIndex = globalThis.playlists.findIndex(({ id: itemID }) => itemID === id);
                    const dragOverItemIndex = globalThis.playlists.findIndex(({ id }) => id === selected);
                    globalThis.SetPlaylists && SetPlaylists(prev => {
                        const old = [...prev];
                        const oldItem = old[dragItemIndex];
                        old[dragOverItemIndex].list.push({
                            type: "playlist",
                            ...oldItem
                        })
                        old[dragOverItemIndex].nesting += 1;
                        old.splice(dragItemIndex, 1);
                        return old;
                    })
                    onClose();
                }}
            >
                ↬↫ Merge
            </Button>
        </ButtonsCover>
    </Modal>
}

os.compileApp("merge-modal", <MergeModal />);
