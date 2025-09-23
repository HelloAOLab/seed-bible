const { useMemo, useState, useEffect } = os.appHooks;

const RenderIcon = ({ isCustomIcons, big = false, isAllowSet = false, icon, list = [], onDelete }) => {

    const [mylist, setMylist] = useState(list);

    const firstItemID = useMemo(() => {
        let name = "🎶";
        const firstItem = mylist.find(ele => globalThis.ValidTypes[ele?.type]);
        if (firstItem) {
            name = firstItem.additionalInfo.data.bookId || firstItem.additionalInfo.data.id || firstItem.additionalInfo.data.bookId || firstItem.additionalInfo.chapterData.id || firstItem.additionalInfo.chapterData.bookId;
        }
        return name;
    }, [mylist]);

    useEffect(() => {
        if (isAllowSet) {
            globalThis.SetRenderMylist = setMylist;
        }
    }, [isAllowSet]);

    return (
        <div className={`playlist-details-icon ${big ? " big" : ""}`} style={{ position: 'relative', backgroundColor: 'rgb(217, 217, 217)' }
        }>
            {
                isCustomIcons ?
                    <img src={icon} style={{ width: '24px' }
                    } />
                    :
                    <span>
                        {firstItemID}
                    </span>}
            {
                onDelete && isCustomIcons && <span onClick={onDelete} style={{ cursor: 'pointer', position: 'absolute', bottom: '0.2rem', color: '#D36433', right: '0.2rem', fontSize: '12px', zIndex: '10' }} className="material-symbols-outlined unfollow">
                    delete
                </span>
            }
        </div >
    )
};

return RenderIcon;