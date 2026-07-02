import { DragDropWithGrouping } from "ext_discover.components.DragDropWithGrouping";
import { navigationWithDataItem } from "ext_discover.helper.navigationWithDataItem";
import { tryAddDataToPlaylist } from "ext_discover.helper.tryAddDataToPlaylist";
import { playlistCss } from "ext_discover.css.playlistCss";
import { getHistoryManager } from "ext_discover.managers.HistoryManager";
import type { HistoryProps } from "ext_discover.interfaces.components.History";
import { Button } from "ext_discover.features.components.Button";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export function History({ id, manager = getHistoryManager(id) }: HistoryProps) {
  const history = manager.historyList.value;

  const onHanldeAddToPlaylistClick = (props: {
    dataItem: any;
    bulkAdd?: boolean;
  }) => {
    const { dataItem, bulkAdd = false } = props;
    if (G.creatingPlaylist) {
      tryAddDataToPlaylist({ dataItem, bulkAdd });
    }
  };

  const onClick = (params: { dataItem: any; bulkAdd?: boolean }) => {
    const { dataItem, bulkAdd = false } = params;
    navigationWithDataItem({ dataItem, bulkAdd }, getPlaylistBot());
  };

  return (
    <div style={{ padding: "12px" }}>
      <style>{playlistCss}</style>
      <div>
        <div className="history">
          {G.creatingPlaylist && !!history.length && (
            <Button
              style={{ fontSize: "12px", margin: "12px 0" }}
              onClick={() => {
                onHanldeAddToPlaylistClick({
                  dataItem: history,
                  bulkAdd: true,
                });
              }}
            >
              Copy All History
            </Button>
          )}
          <DragDropWithGrouping
            list={history}
            setList={manager.setHistory}
            deleteFromList={manager.deleteDataFromHistory}
            creatingPlaylist
            onClick={onClick}
            onClickItem={onHanldeAddToPlaylistClick}
          />
        </div>
      </div>
    </div>
  );
}
