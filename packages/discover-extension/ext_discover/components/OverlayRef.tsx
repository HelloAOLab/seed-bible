import { navigationWithDataItem } from "ext_discover.helper.navigationWithDataItem";
import type { OverlayRefProps } from "ext_discover.interfaces.components.OverlayRef";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

const ButtonStyle = {
  cursor: "pointer",
  border: "1px solid grey",
  borderRadius: "40px",
  padding: "6px",
  fontSize: "14px",
  marginLeft: "4px",
};

export function OverlayRef({ manager }: OverlayRefProps) {
  const dataItems = manager.dataItems.value;
  const pos = manager.position.value;
  const linkingMode = manager.linkingMode.value;
  const removeID = manager.removeID.value;
  const playListId = manager.playListId.value;

  if (dataItems.length < 1) {
    return null;
  }

  return (
    <>
      <div
        style={{
          top: `${pos.y}px`,
          left: `${pos.x}px`,
        }}
        className="overlay linked-item-custom"
      >
        <h4>{t("linkedItems")}:</h4>
        {dataItems.map((data, index) => (
          <div key={data.id} className={`history-item`}>
            {false && (
              <span class="material-symbols-outlined unfollow">
                drag_indicator
              </span>
            )}
            <p
              className={data.type}
              onClick={() => {
                navigationWithDataItem(
                  {
                    dataItem: data,
                    bulkAdd: false,
                  },
                  getPlaylistBot()
                );
              }}
            >
              {data.content}
            </p>
            <p style={{ fontSize: "12px", marginLeft: "12px" }}>
              Of {data.playlistName}
            </p>
            {linkingMode && (
              <span
                class="end-icon unfollow material-symbols-outlined"
                style={ButtonStyle}
                onClick={() => {
                  if (G?.onCurrentCollectionEdit) {
                    G.onCurrentCollectionEdit({
                      data,
                      isDelete: true,
                      index,
                      playListId,
                      removeID,
                    });
                    manager.unLinkItem(index);
                  }
                }}
              >
                link_off
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="backdrop" onClick={manager.close} />
    </>
  );
}
