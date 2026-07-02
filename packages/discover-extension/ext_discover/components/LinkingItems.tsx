import { displayOverlay } from "ext_discover.helper.displayOverlay";
import { cursorFollow } from "ext_discover.helper.cursorFollow";
import {
  getCurrentActiveLinkItemFloat,
  setCurrentActiveLinkItemFloat,
} from "ext_discover.helper.activeLinkItemFloat";
import type { LinkingItemsProps } from "ext_discover.interfaces.components.LinkingItems";

const G = globalThis as Record<string, any>;

export function LinkingItems({
  data,
  linkingMode,
  playlistName,
  playListId,
}: LinkingItemsProps) {
  const links = data.links;

  return (
    <>
      {linkingMode && (
        <p
          className="end-icon without-border"
          style={{ marginRight: "0" }}
          onClick={() => {
            if (getCurrentActiveLinkItemFloat()) {
              if (G.onCurrentCollectionEdit) {
                G.onCurrentCollectionEdit({ data, playlistName, playListId });
              }
            } else {
              cursorFollow();
              setCurrentActiveLinkItemFloat({
                ...data,
                playlistName,
                playListId,
              });
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
      {links && links.length > 0 && (
        <div
          className={`overlay-ref ${!linkingMode ? "end-icon" : ""}`}
          onClick={() =>
            displayOverlay({
              items: links as Record<string, any>[],
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
}
