// type =  book/section/testament
// content = Name
// additionalInfo = rank, sectionRank, testamentRank
// number -> Index of chpater / verse / book

const { useState, useLayoutEffect, useMemo } = os.appHooks;
const G = globalThis;
const { Button } = G.Components;

const History = (props: any) => {
  const { id } = props;
  const DragDropT = useMemo(() => G.DragDrop, []);
  const [history, setHistory] = useState(G?.[`${id}currentHistory`] || []);

  const addDataToHistory = (data: any) => {
    const lastData = history[history.length - 1];
    const isSame = G.objectComparator(data, lastData, ["content"]);
    if (!isSame) {
      setHistory((prev: any) => {
        const old = [...prev];
        old.push(data);
        return old;
      });
    } else {
      // os.toast("Last item repeated!");
    }
  };

  const deleteDataFromHistory = (index: any) => {
    if (G.creatingPlaylist) return;
    const idsMap: any = {};
    const isArray = Array.isArray(index);
    if (isArray) index.forEach((id) => (idsMap[id] = true));
    setHistory((prev: any) => {
      let old = [...prev];
      if (isArray) {
        old = old.filter((data) => !idsMap[data.id]);
      } else {
        old.splice(index, 1);
      }
      return old;
    });
  };

  useLayoutEffect(() => {
    G[`${id}AddDataToHistory`] = addDataToHistory;
    G[`${id}currentHistory`] = history;
    G.setHistoryLocale(history, id);
    return () => {
      G[`${id}AddDataToHistory`] = null;
    };
  }, [history]);

  const onHanldeAddToPlaylistClick = (props: any) => {
    const { dataItem, bulkAdd = false } = props;
    if (G.creatingPlaylist) {
      thisBot.tryAddDataToPlaylist({ dataItem, bulkAdd });
    }
  };

  const onClick = (params: any) => {
    const { dataItem, bulkAdd = false } = params;
    thisBot.navigationWithDataItem({ dataItem, bulkAdd });
  };

  return (
    <div style={{ padding: "12px" }}>
      <style>{thisBot.tags["playlist.css"]}</style>
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
          <DragDropT
            list={history}
            setList={setHistory}
            deleteFromList={deleteDataFromHistory}
            creatingPlaylist
            onClick={onClick}
            onClickItem={onHanldeAddToPlaylistClick}
          />
        </div>
      </div>
    </div>
  );
};

return History;
