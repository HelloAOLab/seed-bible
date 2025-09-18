// type =  book/section/testament
// content = Name
// additionalInfo = rank, sectionRank, testamentRank  
// number -> Index of chpater / verse / book

const { useState, useEffect, useRef, useMemo } = os.appHooks;
const { Button } = Components;

const History = ({ id }) => {
    const [history, setHistory] = useState(globalThis?.[`${id}currentHistory`] || []);

    const addDataToHistory = (data) => {
        const lastData = history[history.length - 1];
        const isSame = objectComparator(data, lastData, ["content"]);
        if (!isSame) {
            setHistory(prev => {
                const old = [...prev];
                old.push(data);
                return old;
            });
        } else {
            os.toast("Last item repeated!");
        }
    }


    const deleteDataFromHistory = (index) => {
        if (globalThis.creatingPlaylist) return;
        const idsMap = {};
        const isArray = Array.isArray(index);
        if (isArray) index.forEach(id => idsMap[id] = true);
        setHistory(prev => {
            let old = [...prev];
            if (isArray) {
                old = old.filter((data) => !idsMap[data.id]);
            } else {
                old.splice(index, 1);
            }
            return old;
        })
    }

    useEffect(() => {
        globalThis[`${id}AddDataToHistory`] = addDataToHistory;
        globalThis[`${id}currentHistory`] = history;
        setHistoryLocale(history, id);
        return () => {
            globalThis[`${id}AddDataToHistory`] = null;
        }
    }, [history])

    const onHanldeAddToPlaylistClick = ({ dataItem, bulkAdd = false }) => {
        if (globalThis.creatingPlaylist) {
            thisBot.tryAddDataToPlaylist({ dataItem, bulkAdd });
        }
    }

    const onClick = ({ dataItem, bulkAdd = false }) => {
        thisBot.navigationWithDataItem({ dataItem, bulkAdd });
    }


    return <div style={{ padding: "12px" }}>
        <style>{thisBot.tags["playlist.css"]}</style>
        <div>
            <div className="history">
                {globalThis.creatingPlaylist && !!history.length && <Button
                    style={{ fontSize: '12px', margin: '12px 0' }}
                    onClick={() => {
                        onHanldeAddToPlaylistClick({ dataItem: history, bulkAdd: true })
                    }}

                >Copy All History</Button>}
                <DragDrop
                    list={history}
                    setList={setHistory}
                    deleteFromList={deleteDataFromHistory}
                    creatingPlaylist
                    onClick={onClick}
                    onClickItem={onHanldeAddToPlaylistClick} />
            </div>
        </div>
    </div>
}

return History; 