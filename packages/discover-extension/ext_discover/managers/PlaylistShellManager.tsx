import { signal, effect } from "@preact/signals";
import { CloseFloatingApp } from "ext_discover.helper.CloseFloatingApp";
import { CloseSelf } from "ext_discover.helper.CloseSelf";
import { runPlaylistPlaying } from "ext_discover.helper.runPlaylistPlaying";
import type { PlaylistShellManager } from "ext_discover.interfaces.managers.PlaylistShellManager";
import type { OverlayPosition } from "ext_discover.models.playlist";
import { isMobilePlaylistViewport } from "ext_discover.hooks.isMobilePlaylistViewport";

const G = globalThis as Record<string, any>;

function getInitialPosition(): OverlayPosition {
  const getPosition = G.getPosition as (() => OverlayPosition) | undefined;
  return getPosition ? getPosition() : { x: 0, y: 0 };
}

export function createPlaylistShellManager(): PlaylistShellManager {
  const showAddToPlaylist = signal(false);
  const createOptions = signal(false);
  const showPlaylistPosition = signal<OverlayPosition>(getInitialPosition());
  const stopPlaylistModal = signal(false);
  const tab = signal<string>(G.currentActiveItem || "discover");
  const hide = signal(false);
  const queueOpen = signal(false);
  const openModal = signal(false);
  const sidebarOpen = signal(true);
  const openExternalLink = signal<string | null>(null);
  const splitAppPanel2 = signal<unknown>(null);

  const setShowAddToPlaylist = (value: boolean) => {
    showAddToPlaylist.value = value;
  };
  const setCreateOptions = (value: boolean) => {
    createOptions.value = value;
  };
  const setStopPlaylistModal = (value: boolean) => {
    stopPlaylistModal.value = value;
  };
  const setTab = (value: string) => {
    tab.value = value;
  };
  const setHide = (value: boolean) => {
    hide.value = value;
  };
  const setQueueOpen = (value: boolean) => {
    queueOpen.value = value;
  };
  const setOpenModal = (value: boolean) => {
    openModal.value = value;
  };
  const setSidebarOpen = (value: boolean) => {
    sidebarOpen.value = value;
  };
  const setOpenExternalLink = (value: string | null) => {
    openExternalLink.value = value;
  };
  const setSplitAppPanel2 = (value: unknown) => {
    splitAppPanel2.value = value;
  };

  const closeConfirmStopPlaylist = () => {
    setStopPlaylistModal(false);
  };

  const gotoCreate = (isAnnotation = false) => {
    const playlistModeTypes = G.PlaylistModeTypes as Record<string, string>;

    if (G[`${"default"}SetMode`]) {
      G[`${"default"}SetMode`](
        isAnnotation
          ? playlistModeTypes.annotations
          : playlistModeTypes.playlist
      );
    } else {
      G.SetTab?.("create");
      G[`${"default"}mode`] = isAnnotation
        ? playlistModeTypes.annotations
        : playlistModeTypes.playlist;
    }
    setCreateOptions(false);
  };

  const closePlaylist = () => {
    CloseSelf({ force: true });
  };

  effect(() => {
    G.StopPlayingPlaylistModal = setStopPlaylistModal;
  });

  effect(() => {
    G.SetHidePlaylist = setHide;
    G.IsHidden = hide.value;
  });

  effect(() => {
    G.SetIsQueuePlaying = setQueueOpen;
  });

  effect(() => {
    G.SetSidebarOpen = setSidebarOpen;
  });

  effect(() => {
    G.SetSplitAppPanel2 = setSplitAppPanel2;
  });

  effect(() => {
    G.currentActiveItem = tab.value;
    G.setTabPlaylist = setTab;
  });

  const mountShell: PlaylistShellManager["mountShell"] = (thisBot) => {
    const isMobile = isMobilePlaylistViewport();

    if (isMobile) {
      G.SetPlaylistForcedHeight?.(2);
    }
    if (G.IsPlaylistPlaying) {
      void runPlaylistPlaying({ skipAll: true });
    }

    G.makingPlaylist = true;
    G.setOpenSidebar?.(false);
    G.SetShowAddToPlaylist = setShowAddToPlaylist;
    G.SetTab = setTab;

    const onKeyUp = (e: KeyboardEvent) => {
      whisper(thisBot, "onKeyUp", { keys: [e.key] });
    };
    const onKeyDown = (e: KeyboardEvent) => {
      whisper(thisBot, "onKeyDown", { keys: [e.key] });
    };

    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("keydown", onKeyDown);

    G.SetOpenExternalLinkHigh = (link: string) => {
      if (isMobile) {
        setOpenExternalLink(link);
      } else {
        os.openURL(link);
      }
    };

    return () => {
      G.makingPlaylist = false;
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("keydown", onKeyDown);
      os.removeBotListener(thisBot, "onKeyDown", onKeyDown);
      os.removeBotListener(thisBot, "onKeyUp", onKeyUp);
      G.SetTab = null;
      G.SelectedItemIDForAttachments = null;
      G.StopVideoRecording = false;
      G.RemoveApplicationByID?.(G.PLAYLIST_PANEL_ID);
      G.PLAYLIST_PANEL_ID = null;
      G.IS_PLAYLIST_ACTIVE = false;
      G[`defaultToggleGreyCheckPLayingPlaylist`]?.(null);
      CloseFloatingApp();
      G.SetSplitAppPanel2?.(null);
      G.makingPlaylist = false;
      G.SetMediaURL?.(null);
      G.SetVideoSrc?.(null);
      G.SetPlaylistForforcedHeight?.(0);
      G.SetShowAddToPlaylist = null;
      G.SetOpenExternalLinkHigh = null;
      G.SetEditData = null;
      G.SetEditRichText = null;
      G.SetEditAnnoData = null;
      G.SetEditAttachmentItem = null;
      G.SetAnnotationData = null;
    };
  };

  return {
    showAddToPlaylist,
    createOptions,
    showPlaylistPosition,
    stopPlaylistModal,
    tab,
    hide,
    queueOpen,
    openModal,
    sidebarOpen,
    openExternalLink,
    splitAppPanel2,
    setShowAddToPlaylist,
    setCreateOptions,
    setStopPlaylistModal,
    setTab,
    setHide,
    setQueueOpen,
    setOpenModal,
    setSidebarOpen,
    setOpenExternalLink,
    setSplitAppPanel2,
    closeConfirmStopPlaylist,
    gotoCreate,
    closePlaylist,
    mountShell,
  };
}
