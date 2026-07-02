import { navigationWithDataItem } from "ext_discover.helper.navigationWithDataItem";
import { saveBookmarks } from "ext_discover.helper.saveBookmarks";

const { useLayoutEffect, useState, useMemo } = os.appHooks;
const G = globalThis as any;
const isMobile =
  (window?.innerWidth || gridPortalBot.tags.pixelWidth) <
  G.MOBILE_VIEWPORT_THRESHOLD;

const UNBOOKMARK_ICON =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/71edcb41d7fbda4b963eb8b177f190341e7b11f0e150be7aad1a8f102f72e1c4.svg";

const Bookmarks = () => {
  const [bookmarks, setBookmarks] = useState({ ...thisBot.tags.bookmarks });
  const GetLabelT = useMemo(() => G.GetLabel, []);

  useLayoutEffect(() => {
    G.SetBookmarks = setBookmarks;
    return () => {
      G.SetBookmarks = null;
    };
  }, []);

  const deleteBookmark = async (item: any) => {
    try {
      const content = item.content;
      const oldBookmarks = { ...thisBot.tags.bookmarks };

      delete oldBookmarks[content];

      const res = await saveBookmarks({
        bookmarks: oldBookmarks,
        t,
      });

      setTag(thisBot, "bookmarks", oldBookmarks);

      setBookmarks(oldBookmarks);
      ShowNotification({
        message: `Bookmark delete successfully.`,
        severity: "success",
      });
    } catch (err) {
      console.log(err);
      ShowNotification({
        message: `Unable to delete bookmarks. Please try again.`,
        severity: "error",
      });
    }
  };

  const finalBookmarks = useMemo(() => {
    return Object.keys(bookmarks).map((ele) => bookmarks[ele]);
  }, [bookmarks]);

  return (
    <div
      style={{
        flexGrow: "1",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h3 style={{ margin: "1rem 0" }}>{t("bookmarks")}</h3>
      {finalBookmarks.length === 0 && <p>{t("nothingBookmarked")}</p>}
      {finalBookmarks.map((data) => (
        <div
          key={`${data.id}-${data.readAlready}`}
          style={{ display: "flex" }}
          className={`history-item bookmark`}
          onClick={() => {
            navigationWithDataItem({ dataItem: data }, thisBot);
          }}
          draggable={true}
        >
          <div
            className={`playlist-item-type bookmark no-left-padding playlist-item-${data.type}`}
            style={{ display: "flex", alignItems: "center" }}
          >
            <p className="number-style" style={{ width: "80px" }}>
              <GetLabelT
                value="discover"
                currentOpenedBook={{
                  book: data.content,
                }}
                // Basically forcing it
                widthCompare={1000}
              />
            </p>
            <p className="verse-style" style={{ flexGrow: 1 }}>
              - {data.additionalInfo.data?.text?.substr(0, 18)}
              {data.additionalInfo.data?.text?.length > 18 ? "..." : ""}
            </p>
            <p
              className="time-style"
              style={{
                width: "92px",
                textAlign: "right",
                marginRight: "1.25rem",
              }}
            >
              {FormatRelativeTime(data.time ? new Date(data.time) : null)}
            </p>
          </div>

          <div className="actions">
            <p
              className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
              onClick={(e) => {
                e.stopPropagation();
                deleteBookmark(data);
              }}
            >
              <span class="material-symbols-outlined unfollow delete-icon">
                delete
              </span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

return Bookmarks;
