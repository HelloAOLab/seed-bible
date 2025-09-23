const { useEffect, useState, useMemo } = os.appHooks;
const isMobile = gridPortalBot.tags.pixelWidth < MOBILE_VIEWPORT_THRESHOLD;

const Bookmarks = () => {
    const [bookmarks, setBookmarks] = useState({ ...thisBot.tags.bookmarks });

    useEffect(() => {
        globalThis.SetBookmarks = setBookmarks;
        return () => {
            globalThis.SetBookmarks = null;
        }
    }, []);

    const deleteBookmark = async (item) => {
        try {
            const content = item.content;
            const oldBookmarks = { ...thisBot.tags.bookmarks };

            delete oldBookmarks[content];

            const res = await thisBot.saveBookmarks({
                bookmarks: oldBookmarks
            });

            setTag(thisBot, "bookmarks", oldBookmarks);

            setBookmarks(oldBookmarks);
            ShowNotification({ message: `Bookmark delete successfully.`, severity: "success" });
        } catch (err) {
            console.log(err);
            ShowNotification({ message: `Unable to delete bookmarks. Please try again.`, severity: "error" });
        }
    }

    const finalBookmarks = useMemo(() => {
        return Object.keys(bookmarks).map(ele => bookmarks[ele]);
    }, [bookmarks])

    return <div
        style={{
            flexGrow: "1",
            display: "flex",
            flexDirection: "column"
        }}
    >
        <h3 style={{ margin: '1rem 0 0 0 ' }}>Bookmarks</h3>
        {finalBookmarks.length === 0 && <p>Nothing Bookmarked.</p>}
        {finalBookmarks.map(data => <div
            key={`${data.id}-${data.readAlready}`}
            style={{ display: "flex", }}
            className={`history-item`}
            onClick={() => { thisBot.navigationWithDataItem({ dataItem: data }); }}
            draggable={true}
        >
            <p
                className={`playlist-item-type no-left-padding playlist-item-${data.type}`}
            >
                {data.content}
            </p>
            <div className="actions">
                <p className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`} onClick={(e) => {
                    e.stopPropagation();
                    deleteBookmark(data)
                }} >
                    <span class="material-symbols-outlined unfollow delete-icon">
                        delete
                    </span>
                </p>
            </div>
        </div>)}
    </div>
}

return Bookmarks;