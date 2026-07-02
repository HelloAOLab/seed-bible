import { CloseSelf } from "ext_discover.helper.CloseSelf";
import { PlayingLayersConversion } from "ext_discover.helper.PlayingLayersConversion";
import { checkIfNeedToSkip } from "ext_discover.helper.checkIfNeedToSkip";
import { renderLinkContent } from "ext_discover.helper.renderLinkContent";
import { setupNowBarControlApp } from "ext_discover.helper.setupNowBarControlApp";
import { navigationWithDataItem } from "ext_discover.helper.navigationWithDataItem";
import { getCurrentPlayingItem } from "ext_discover.hooks.getCurrentPlayingItem";
import { getUtcTimestamp } from "ext_discover.hooks.getUtcTimestamp";
import { PlayingPlaylist } from "ext_discover.components.PlayingPlaylist";
import { getPlayingPlaylistManager } from "ext_discover.managers.PlayingPlaylistManager";
import type { PlaylistPlayingOpts } from "ext_discover.interfaces.managers.PlaylistPlayingManager";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export async function runPlaylistPlaying(
  opts: PlaylistPlayingOpts
): Promise<void> {
  const source = opts.remoteClick ? opts.features! : opts;
  const {
    playingPlaylist,
    skipAll,
    startIndex,
    startSubIndex,
    parentId = "default",
    name: playlistName,
    list = undefined,
  } = source as Record<string, any>;

  if (skipAll) {
    os.unregisterApp("playing-playlist");
    os.registerApp("playing-playlist", getPlaylistBot());
    G.IS_PLAYLIST_ACTIVE = 1;
  } else {
    if (!G.IsQueuePresent) {
      os.unregisterApp("playing-playlist");
      os.registerApp("playing-playlist", getPlaylistBot());
      G.IS_PLAYLIST_ACTIVE = 1;
      G.PlayingPlaylists = {};
      G.CurrentIndexItem = {};
    } else {
      if (G.READING_PLAN_WORK) return;
      let playlist = G[`${parentId}playlists`]?.find(
        (ele: any) => ele.id === playingPlaylist
      );
      if (list) {
        playlist = {
          list,
          isLayers: false,
          id: G.createUUID(),
          playlistID: playingPlaylist,
          checklistEnabled: false,
          readingPlanEnabled: false,
        };
      }
      G.SetPlayingList((prev: any) => {
        const keys = Object.keys(prev);
        const keyNumber = keys.length;
        return {
          ...prev,
          [keyNumber]: {
            name: playlistName,
            list: playlist.isLayers
              ? PlayingLayersConversion(playlist.list)
              : playlist.list,
            id: G.createUUID(),
            playlistID: playlist.id,
            isLayers: playlist.isLayers,
          },
        };
      });
      if (!skipAll) CloseSelf();
      return;
    }
  }

  let subIndex = startSubIndex;

  let playlist: any = opts.remoteClick
    ? { ...opts.playlist }
    : !playingPlaylist
      ? {}
      : G[`${parentId}playlists`]?.find(
          (ele: any) => ele.id === playingPlaylist
        );

  if (!skipAll) {
    EmitData("playlistPlayed", { features: opts, playlist });
  }

  if (list) {
    playlist = {
      list,
      isLayers: false,
      id: G.createUUID(),
      playlistID: playingPlaylist,
      checklistEnabled: false,
      readingPlanEnabled: false,
    };
  }

  const thh = playlist.list;
  const checklistEnabled = playlist.checklistEnabled;
  const readingPlanEnabled = playlist.readingPlanEnabled;
  const currentFormat = playlist.dateFormat;

  const isfirstItemPlaylist = !!thh?.[0]?.list;

  if (startIndex === 0 && isfirstItemPlaylist) {
    subIndex = 0;
  }

  let firstIndex = 0;
  const pastDateEvents: Record<string, boolean> = {};
  const closestNearDateEvent: Record<string, boolean> = {};
  const currentDate = new Date(
    `${G.FORMAT_YYYY_MM_DD(new Date())}T00:00:00.000Z`
  ).getTime();
  let lastActiveDate = new Date("01-01-1900").getTime();
  let closestDateFound = false;
  let futureDateBreak = false;
  let findLastActiveIndex = -1;
  let firstActiveIndex = -1;
  let firstActiveItem: any = null;

  if (!skipAll) {
    for (let i = 0; i < thh.length; i++) {
      const ele = thh[i];
      if (ele.type !== "heading") {
        firstIndex = i;
        const firstInnerItem = ele?.additionalInfo?.layers?.[0];
        if (G.IsVideoAttachment(firstInnerItem) && firstInnerItem.autoPlay) {
          setTimeout(() => {
            G[`${ele.id}OpenToggle`] && G[`${ele.id}OpenToggle`](true);
          }, 200);
          subIndex = 1;
        } else {
          subIndex = 0;
        }
        break;
      }
    }

    if (readingPlanEnabled) {
      playlist.list.forEach((ele: any, index: number) => {
        if (ele.type === "date") {
          lastActiveDate = getUtcTimestamp(ele.additionalInfo.date);
          if (lastActiveDate >= currentDate) {
            if (closestDateFound) futureDateBreak = true;
            closestDateFound = true;
          }
          if (!futureDateBreak && !closestDateFound) {
            pastDateEvents[ele.id] = true;
            pastDateEvents[`${G.pseudoIndentifier}${ele.id}`] = true;
          }
        } else {
          if (lastActiveDate < currentDate) {
            pastDateEvents[ele.id] = true;
            pastDateEvents[`${G.pseudoIndentifier}${ele.id}`] = true;
          } else if (!futureDateBreak) {
            closestNearDateEvent[ele.id] = true;
            findLastActiveIndex = index;
          }
          if (firstActiveIndex === -1 && ele.type !== "heading") {
            firstActiveIndex = index;
            firstActiveItem = ele;
          }
        }
      });

      if (firstActiveIndex > -1) {
        firstActiveIndex = -1;
        thh.forEach((ele: any, i: number) => {
          if (ele.id === firstActiveItem.id) firstActiveIndex = i;
          if (firstActiveIndex === -1 && Array.isArray(ele.additionalInfo)) {
            ele.additionalInfo.forEach((item: any) => {
              if (item.id === firstActiveItem.id) firstActiveIndex = i;
            });
          }
        });
      }
    }

    if (!checklistEnabled) {
      const findIndex = readingPlanEnabled ? firstActiveIndex : firstIndex;
      const tgITM = getCurrentPlayingItem(
        0,
        findIndex,
        { 0: { list: PlayingLayersConversion(playlist.list) } },
        0
      );

      if (tgITM?.type === "attachment-link") {
        renderLinkContent({
          ...tgITM,
          isLastItem:
            thh.length === 1 &&
            (!isfirstItemPlaylist || thh[0].list.length === 1),
          isFirstItem: startIndex === 0 && subIndex < 1,
        });
      } else if (tgITM) {
        const isBulk = Array.isArray(tgITM.additionalInfo);
        const skip = await checkIfNeedToSkip({ dataItem: tgITM });
        if (!skip) {
          navigationWithDataItem(
            { dataItem: isBulk ? tgITM.additionalInfo : tgITM },
            getPlaylistBot()
          );
        }
      }
      G[`${parentId}ToggleGreyCheckPLayingPlaylist`] &&
        G[`${parentId}ToggleGreyCheckPLayingPlaylist`](tgITM?.id);
    }

    G.PPthh = thh;
    G.PPpastDateEvents = pastDateEvents;
    G.PPchecklistEnabled = checklistEnabled;
    G.PPreadingPlanEnabled = readingPlanEnabled;
    G.PlayingPlaylistID = playlist.id;
    G.PPfirstActiveIndex = firstActiveIndex;
    G.PPfirstIndex = firstIndex;
    G.PPplaylist = playlist;
    G.PPsubIndex = subIndex;
    G.PPplaylistName = playlistName;
    G.PPclosestNearDateEvent = closestNearDateEvent;
  }

  await setupNowBarControlApp({ parentId });
  G.SetDontShowMobileBottomNavbar(true);

  const manager = getPlayingPlaylistManager(parentId);
  manager.syncSession({ parentId, currentFormat });

  if ((playlist && !G.IsQueuePresent) || skipAll) {
    G.IsQueuePresent = true;
    G.SetSplitAppPanel2 &&
      G.SetSplitAppPanel2(
        <PlayingPlaylist manager={manager} scope={parentId} />
      );
    if (!skipAll) CloseSelf();
  }
}
