// const { useState } = os.appHooks;

const Linking = ({ data, linkingMode, playlistName, playListId }) => {
    const links = data.links;

    return <>
        {linkingMode && <p
            className="end-icon without-border"
            style={{ marginRight: '0' }}
            onClick={() => {
                if (this.CURRENT_ACTIVE_LINK_ITEM_FLOAT) {
                    if (globalThis.onCurrentCollectionEdit) {
                        globalThis.onCurrentCollectionEdit({ data, playlistName, playListId });
                    }
                } else {
                    this.cursorFollow();
                    this.CURRENT_ACTIVE_LINK_ITEM_FLOAT = { ...data, playlistName, playListId };
                }

            }}
        >
            <span class="material-symbols-outlined unfollow" style={{ fontSize: "18px" }}>
                rebase
            </span>
        </p>}
        {links?.length > 0 && <div className={`overlay-ref ${!linkingMode ? "end-icon" : ""}`} onClick={() => thisBot.displayOverlay({ items: links, removeID: data.id, playListId, linkingMode })}>
            <p className="link-tag"> 🖇{links.length}</p>
        </div>}

    </>
}

// onPointerDown={() => {
//     if (!viewOnly) {
//         globalThis.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
//             globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
//             onClickItem({ dataItem: data })
//         }, 1000);
//     }
// }}

return Linking;