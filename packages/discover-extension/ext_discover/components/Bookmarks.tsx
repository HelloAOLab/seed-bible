import { GetLabel } from "ext_discover.components.GetLabel";
import { getBookmarksManager } from "ext_discover.managers.BookmarksManager";
import { isMobilePlaylistViewport } from "ext_discover.hooks.isMobilePlaylistViewport";
import { navigationWithDataItem } from "ext_discover.helper.navigationWithDataItem";
import type { BookmarksProps } from "ext_discover.interfaces.components.Bookmarks";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export function Bookmarks({
  manager = getBookmarksManager(),
  currentOpenedBook,
}: BookmarksProps) {
  const GetLabelT = GetLabel;
  const finalBookmarks = manager.finalBookmarks.value;
  const isMobile = isMobilePlaylistViewport();

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
            navigationWithDataItem({ dataItem: data }, getPlaylistBot());
          }}
          draggable={true}
        >
          <div
            className={`playlist-item-type bookmark no-left-padding playlist-item-${data.type}`}
            style={{ display: "flex", alignItems: "center" }}
          >
            <p className="number-style" style={{ width: "80px" }}>
              {GetLabelT ? (
                <GetLabelT
                  value="discover"
                  currentOpenedBook={{
                    book: data.content,
                  }}
                  widthCompare={1000}
                />
              ) : (
                data.content
              )}
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
              {G.FormatRelativeTime(data.time ? new Date(data.time) : null)}
            </p>
          </div>

          <div className="actions">
            <p
              className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
              onClick={(e) => {
                e.stopPropagation();
                manager.deleteBookmark(data);
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
}
