let name = "overlay-ref";

if (that?.name) {
    name = "overlay-ref";
}

const items = that.items;
const removeID = that.removeID;
const playListId = that.playListId;
const linkingMode = that.linkingMode;

const pos = gridPortalBot.tags.pointerPixel;

const { useState } = os.appHooks;

os.unregisterApp(name);
os.registerApp(name);

const ButtonStyle = {
    cursor: "pointer",
    border: "1px solid grey",
    borderRadius: "40px",
    padding: "6px",
    fontSize: "14px",
    marginLeft: "4px",
}


const Overlay = () => {
    const [dataItems, setDataItems] = useState([...items]);

    const unLinkItem = (index) => {
        setDataItems(prev => {
            const old = [...prev];
            old.splice(index, 1);
            return old;
        });
    }

    if (dataItems.length < 1) os.unregisterApp(name);

    return <>
        <div
            style={{
                bottom: `${pos.y}px`,
                left: `${pos.x}px`,
            }}
            className="overlay linked-item-custom"
        >
            <h4>Linked Items:</h4>
            {dataItems.map((data, index) => <div key={data.id} className={`history-item`}>
                {false && <span class="material-symbols-outlined unfollow">
                    drag_indicator
                </span>}
                <p
                    className={data.type}
                    onClick={() => {
                        thisBot.navigationWithDataItem({ dataItem: data, bulkAdd: false });
                    }}
                >
                    {data.content}
                </p>
                <p style={{ fontSize: "12px", marginLeft: "12px" }}>
                    Of {data.playlistName}
                </p>
                {linkingMode && <span
                    class="end-icon unfollow material-symbols-outlined"
                    style={ButtonStyle}
                    onClick={() => {
                        if (globalThis.onCurrentCollectionEdit) {
                            globalThis.onCurrentCollectionEdit({ data, isDelete: true, index, playListId, removeID });
                            unLinkItem(index);
                        }
                    }}
                >
                    link_off
                </span>}
            </div>)}
        </div>
        <div className="backdrop" onClick={() => os.unregisterApp(name)} />
    </>
}

os.compileApp(name, <Overlay />)