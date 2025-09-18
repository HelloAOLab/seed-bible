const { useState, useEffect } = os.appHooks;

const tabItems = ["Collections"];

const { Button, Select } = Components;

const PlaylistRowItem = await thisBot.PlaylistRowItem();

const ButtonStyle = {
    cursor: "pointer",
    border: "1px solid grey",
    borderRadius: "40px",
    padding: "6px",
    fontSize: "24px",
    marginLeft: "4px",
};

const PlaylistLinkedContainer = ({ playlist }) => {
    return <PlaylistRowItem
        viewOnly={true}
        linkingMode={false}
        parentId={playlist.parentId}
        playingPlaylist={false}
        handleDragStart={() => { }}
        setOpenedList={() => { }}
        opendedList={playlist.id}
        clickPass={true}
        handleDragOver={() => { }}
        handleDragEnd={() => { }}
        dragOverSet={() => { }}
        id={playlist.id}
        name={playlist.name}
        list={playlist.list}
    />
}

const CollectionsContainer = ({ collections, collection, currentCollection, collectionName, setCurrentCollection }) => {

    const [view, setview] = useState(0);

    const COLLECTIONS_OPTIONS = Object.keys(collections).map((ele) => ({
        label: collections[ele].name,
        value: ele
    }))

    return <>
        <div style={{ display: "flex", flexDirection: "column", padding: "12px" }}>
            {Object.keys(collections).length > 0 && <div style={{ display: "flex", alignItems: "center", justifyContent: 'space-between' }}>
                <Select style={{ padding: '12px' }} secondary value={currentCollection} onChangeListener={(val) => { setCurrentCollection(val); }} name="Select Collection:" options={COLLECTIONS_OPTIONS} />
                <Button
                    onClick={() => {
                        globalThis.EDIT_COLLECTION_ID = currentCollection;
                        thisBot.PlaylistLinkModal({ currentCollection: collection, name: collectionName });
                    }}
                    secondary

                >
                    Edit
                </Button>

                <Button
                    onClick={() => {
                        const newCollections = { ...collections };
                        delete newCollections[currentCollection];
                        globalThis.COLLECTION_SETTER && globalThis.COLLECTION_SETTER(newCollections)
                    }}
                    secondaryAlt
                >
                    Delete
                </Button>
            </div>}
            <div className="playlist-container-data">
                {Object.keys(collections).length === 0 ?
                    <p> No Collections Saved. </p> :
                    !collection ?
                        <p> No Collections Selected. </p>
                        : <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexDirection: 'column' }}>
                            {collection.map(coll => <div style={{ display: "flex", flexDirection: "column", padding: '12px 0', maxHeight: "90dvh", width: "100%", overflow: "auto", position: "relative" }}>
                                <PlaylistLinkedContainer playlist={coll} />
                            </div>)}
                        </div>
                }
                <p
                    onClick={() => {
                        thisBot.PlaylistLinkModal({
                            idsMap: []
                        })
                    }}
                    className="playlist-action secondary self-start"
                >
                    <span class="material-symbols-outlined unfollow">
                        playlist_add
                    </span>
                    <span>
                        Add New Collection
                    </span>
                </p>
            </div>

        </div >
    </>
}

return CollectionsContainer;