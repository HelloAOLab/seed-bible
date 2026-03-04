const G = globalThis;

const Linking = (props: any) => {
  const { data, linkingMode, playlistName, playListId } = props;
  const links = data.links;

  return (
    <>
      {linkingMode && (
        <p
          className="end-icon without-border"
          style={{ marginRight: "0" }}
          onClick={() => {
            if (thisBot.CURRENT_ACTIVE_LINK_ITEM_FLOAT) {
              if (G.onCurrentCollectionEdit) {
                G.onCurrentCollectionEdit({ data, playlistName, playListId });
              }
            } else {
              thisBot.cursorFollow();
              thisBot.CURRENT_ACTIVE_LINK_ITEM_FLOAT = {
                ...data,
                playlistName,
                playListId,
              };
            }
          }}
        >
          <span
            class="material-symbols-outlined unfollow"
            style={{ fontSize: "18px" }}
          >
            rebase
          </span>
        </p>
      )}
      {links?.length > 0 && (
        <div
          className={`overlay-ref ${!linkingMode ? "end-icon" : ""}`}
          onClick={() =>
            thisBot.displayOverlay({
              items: links,
              removeID: data.id,
              playListId,
              linkingMode,
            })
          }
        >
          <p className="link-tag"> 🖇{links.length}</p>
        </div>
      )}
    </>
  );
};

// onPointerDown={() => {
//     if (!viewOnly) {
//         globalThis.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
//             globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
//             onClickItem({ dataItem: data })
//         }, 1000);
//     }
// }}

return Linking;
