import { effect, signal } from "@preact/signals";
import { FetchAnnotationContentInBg } from "ext_discover.helper.FetchAnnotationContentInBg";
import { openVideoPlayer } from "ext_discover.helper.openVideoPlayer";
import { startPlaylistPlaying } from "ext_discover.helper.playlistPlaybackHelpers";
import {
  breakHtmlContent,
  htmlContentHasMedia,
} from "ext_discover.hooks.breakHtmlContent";
import type { RenderHTMLContentManager } from "ext_discover.interfaces.managers.RenderHTMLContentManager";

const G = globalThis as Record<string, any>;

const managersByScope = new Map<string, RenderHTMLContentManager>();

export function getRenderHTMLContentManager(
  scope: string
): RenderHTMLContentManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createRenderHTMLContentManager();
  managersByScope.set(scope, manager);
  return manager;
}

export function createRenderHTMLContentManager(): RenderHTMLContentManager {
  const shouldRender = signal(false);
  const open = signal(false);
  const addToQueuePopup = signal(false);
  const htmlContent = signal("");
  const containerElement = signal<HTMLDivElement | null>(null);

  const setContainerRef = (element: HTMLDivElement | null) => {
    containerElement.value = element;
  };

  const syncHtmlContent = (content: string) => {
    htmlContent.value = content;
  };

  effect(() => {
    const content = htmlContent.value;
    const container = containerElement.value;

    if (htmlContentHasMedia(content)) {
      shouldRender.value = true;
      return;
    }

    const height = container?.offsetHeight || 0;
    if (height > 60 && !shouldRender.value) {
      shouldRender.value = true;
    }
  });

  const handlePlayCircleClick = async (e: any, bypassQueue?: boolean) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (G.IsQueuePresent) {
      if (!bypassQueue) {
        addToQueuePopup.value = true;
        return;
      }
      ShowNotification({
        message: t("addToTheCurrentQueue"),
        severity: "success",
      });
    }
    const id = e?.target?.getAttribute?.("id");
    if (!id) return;
    const [authBotId, playlistId] = id.split(G.RECORD_SEPARATOR);
    if (!authBotId || !playlistId) return;

    if (G.LoadingOldPlaylist) {
      return ShowNotification({
        message: t("pleaseWaitOldPlaylistIsLoading"),
        severity: "error",
      });
    }

    ShowNotification({
      message: t("loadingPlaylistPleaseWait"),
      severity: "success",
    });

    G.LoadingOldPlaylist = true;

    let res: any = null;

    if (G.LoadedPlaylistAnnotations[playlistId]) {
      res = {
        success: true,
        data: G.LoadedPlaylistAnnotations[playlistId],
      };
    } else {
      res = await os.getData(authBotId, playlistId);
      G.LoadedPlaylistAnnotations[playlistId] = { ...res.data };
    }

    if (res.success && res.data?.list) {
      const playlistData = res.data;
      startPlaylistPlaying({
        playingPlaylist: playlistData.id,
        startIndex: 0,
        startSubIndex: -1,
        parentId: "default",
        name: playlistData.name,
        list: [...playlistData.list],
      });
    } else {
      ShowNotification({
        message: t("playlistNotFoundOrIsDeleted"),
        severity: "error",
      });
    }
    addToQueuePopup.value = false;
    G.LoadingOldPlaylist = false;
  };

  effect(() => {
    const container = containerElement.value;
    void htmlContent.value;
    void shouldRender.value;
    void open.value;

    if (!container) {
      return;
    }

    const addOverlaysToIframes = () => {
      const iframes = container.querySelectorAll("iframe");
      iframes.forEach((iframe: any) => {
        if (
          iframe.parentElement?.classList.contains("iframe-wrapper") ||
          iframe.parentElement?.querySelector(".iframe-click-overlay")
        ) {
          return;
        }

        const wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.style.display = "inline-block";
        wrapper.className = "iframe-wrapper";

        const overlay = document.createElement("div");
        overlay.className = "iframe-click-overlay";
        overlay.style.position = "absolute";
        overlay.style.inset = "0";
        overlay.style.zIndex = "10";
        overlay.style.cursor = "pointer";
        overlay.style.background = "transparent";
        overlay.style.pointerEvents = "auto";

        iframe.parentNode?.insertBefore(wrapper, iframe);
        wrapper.appendChild(iframe);
        wrapper.appendChild(overlay);
      });
    };

    const handleVideoClick = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      const src = e.target.getAttribute("src");
      if (!src) return;
      openVideoPlayer({ src });
    };

    const handleIframeOverlayClick = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      const iframe = e.target.parentElement?.querySelector("iframe");
      if (!iframe) return;
      const src = iframe.getAttribute("src");
      if (!src) return;

      const linkDetails = G.validateUrl(src);

      if (linkDetails.isValid && linkDetails.type === "youtube") {
        openVideoPlayer({
          src,
          isYoutube: true,
          videoID: linkDetails.videoId,
        });
        return;
      }

      if (linkDetails.isValid && linkDetails.type === "video") {
        openVideoPlayer({ src });
        return;
      }

      if (linkDetails.isValid && linkDetails.type === "externalLink") {
        G.SetOpenExternalLink && G.SetOpenExternalLink(src);
      }
    };

    const timeoutId = setTimeout(() => {
      addOverlaysToIframes();
    }, 100);

    const videos = container.querySelectorAll("video");
    videos.forEach((video: any) => {
      video.addEventListener("click", handleVideoClick);
    });

    const playCircleSpans = container.querySelectorAll("span.sre-play-circle");
    playCircleSpans.forEach((span: any) => {
      const id = span.getAttribute("id");
      FetchAnnotationContentInBg({ playlistId: id });
      span.addEventListener("click", handlePlayCircleClick);
    });

    const handleContainerClick = (e: any) => {
      if (
        e.target.classList &&
        e.target.classList.contains("iframe-click-overlay")
      ) {
        handleIframeOverlayClick(e);
      }
    };
    container.addEventListener("click", handleContainerClick);

    return () => {
      clearTimeout(timeoutId);
      videos.forEach((video: any) => {
        video.removeEventListener("click", handleVideoClick);
      });
      playCircleSpans.forEach((span: any) => {
        span.removeEventListener("click", handlePlayCircleClick);
      });
      container.removeEventListener("click", handleContainerClick);
    };
  });

  return {
    shouldRender,
    open,
    addToQueuePopup,
    setContainerRef,
    toggleOpen: () => {
      open.value = !open.value;
    },
    setAddToQueuePopup: (value: boolean) => {
      addToQueuePopup.value = value;
    },
    handlePlayCircleClick,
    syncHtmlContent,
  };
}
