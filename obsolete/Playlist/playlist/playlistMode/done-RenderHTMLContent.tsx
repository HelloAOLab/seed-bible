import { FetchAnnotationContentInBg } from "ext_discover.helper.FetchAnnotationContentInBg";

const G = globalThis as any;
const { Button, Modal, ButtonsCover } = G.Components;
const { useState, useMemo, useLayoutEffect, useRef, useEffect } = os.appHooks;

const RenderHTMLContent = (props: any) => {
  const { htmlContent } = props;
  const [shouldRender, setShouldRender] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<any>(null);
  const [addToQueuePopup, setAddToQueuePopup] = useState(false);

  useLayoutEffect(() => {
    // If html content contains image, video , iframe, audio, etc. then set shouldRender to true
    const hasMedia =
      htmlContent.includes("img") ||
      htmlContent.includes("video") ||
      htmlContent.includes("iframe") ||
      htmlContent.includes("audio");
    if (hasMedia) {
      setShouldRender(true);
    } else {
      const height = containerRef.current?.offsetHeight || 0;
      if (height > 60 && !shouldRender) {
        setShouldRender(true);
      }
    }
  }, [htmlContent]);

  const handlePlayCircleClick = async (e: any, bypassQueue?: boolean) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (G.IsQueuePresent) {
      if (!bypassQueue) {
        setAddToQueuePopup(true);
        return;
      }
      ShowNotification({
        message: t("addToTheCurrentQueue"),
        severity: "success",
      });
    }
    const id = e.target.getAttribute("id");
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
      thisBot.Playlistplaying({
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
    setAddToQueuePopup(false);
    G.LoadingOldPlaylist = false;
  };

  // ⭐ Add event listeners for video and iframe tags
  useEffect(() => {
    if (!containerRef.current) return;

    // Function to add overlays to iframes
    const addOverlaysToIframes = () => {
      if (!containerRef.current) return;
      const iframes = containerRef.current.querySelectorAll("iframe");
      iframes.forEach((iframe: any) => {
        // Skip if already wrapped or has overlay
        if (
          iframe.parentElement?.classList.contains("iframe-wrapper") ||
          iframe.parentElement?.querySelector(".iframe-click-overlay")
        ) {
          return;
        }

        // Create wrapper
        const wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.style.display = "inline-block";
        wrapper.className = "iframe-wrapper";

        // Create overlay
        const overlay = document.createElement("div");
        overlay.className = "iframe-click-overlay";
        overlay.style.position = "absolute";
        overlay.style.inset = "0";
        overlay.style.zIndex = "10";
        overlay.style.cursor = "pointer";
        overlay.style.background = "transparent";
        overlay.style.pointerEvents = "auto";

        // Wrap iframe
        iframe.parentNode?.insertBefore(wrapper, iframe);
        wrapper.appendChild(iframe);
        wrapper.appendChild(overlay);
      });
    };

    // Function to handle video clicks
    const handleVideoClick = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      const src = e.target.getAttribute("src");
      if (!src) return;

      thisBot.VideoPlayer({
        src: src,
      });
    };

    // Function to handle iframe overlay clicks
    const handleIframeOverlayClick = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      const iframe = e.target.parentElement?.querySelector("iframe");
      if (!iframe) return;
      const src = iframe.getAttribute("src");
      if (!src) return;

      const linkDetails = G.validateUrl(src);

      if (linkDetails.isValid && linkDetails.type === "youtube") {
        thisBot.VideoPlayer({
          src: src,
          isYoutube: true,
          videoID: linkDetails.videoId,
        });
        return;
      }

      if (linkDetails.isValid && linkDetails.type === "video") {
        thisBot.VideoPlayer({
          src: src,
        });
        return;
      }

      if (linkDetails.isValid && linkDetails.type === "externalLink") {
        G.SetOpenExternalLink && G.SetOpenExternalLink(src);
        return;
      }
    };

    // Add overlays to iframes after DOM updates
    const timeoutId = setTimeout(() => {
      addOverlaysToIframes();
    }, 100);

    // Add click listeners to all video elements
    const videos = containerRef.current.querySelectorAll("video");
    videos.forEach((video: any) => {
      video.addEventListener("click", handleVideoClick);
    });

    // Add click listeners to all span tags with id="${id}" className="material-symbols-outlined sre-play-circle sre-play-circle-${id}"
    const playCircleSpans = containerRef.current.querySelectorAll(
      "span.sre-play-circle"
    );
    playCircleSpans.forEach((span: any) => {
      const id = span.getAttribute("id");
      FetchAnnotationContentInBg({
        playlistId: id,
      });
      span.addEventListener("click", handlePlayCircleClick);
    });

    // Add click listeners to all iframe overlays (using event delegation)
    const handleContainerClick = (e: any) => {
      if (
        e.target.classList &&
        e.target.classList.contains("iframe-click-overlay")
      ) {
        handleIframeOverlayClick(e);
      }
    };
    containerRef.current.addEventListener("click", handleContainerClick);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      videos.forEach((video: any) => {
        video.removeEventListener("click", handleVideoClick);
      });
      playCircleSpans.forEach((span: any) => {
        span.removeEventListener("click", handlePlayCircleClick);
      });
      if (containerRef.current) {
        containerRef.current.removeEventListener("click", handleContainerClick);
      }
    };
  }, [htmlContent, shouldRender, open]);

  const breakHTMLCONTENT = useMemo(() => {
    const content = htmlContent.replaceAll(
      `<p style="text-align: left;"></p>`,
      `<br style="text-align: left;"></br>`
    );
    return content;
  }, [htmlContent]);

  return (
    <>
      {addToQueuePopup && (
        <Modal
          title={t("addPlaylistToQueueTitle")}
          showIcon={false}
          onClose={() => setAddToQueuePopup(false)}
        >
          <p>{t("addPlaylistToQueueDescription")}</p>
          <ButtonsCover style={{ gap: "1rem", marginTop: "1rem" }}>
            <Button
              secondary
              onClick={() => {
                handlePlayCircleClick(null, true);
              }}
            >
              {t("yes")}
            </Button>
            <Button secondaryAlt onClick={() => setAddToQueuePopup(false)}>
              {t("no")}
            </Button>
          </ButtonsCover>
        </Modal>
      )}
      <div>
        <div
          className="render-html-content"
          ref={containerRef}
          style={{
            overflow: "hidden",
            height: shouldRender ? (open ? "auto" : "60px") : "auto",
            textTransform: "none",
            transition: "all 0.2s linear",
            paddingBottom: "0.25rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            backgroundColor: "white",
          }}
          dangerouslySetInnerHTML={{ __html: breakHTMLCONTENT }}
        />

        {shouldRender && (
          <span
            style={{
              textAlign: "center",
              cursor: "pointer",
              fontSize: "12px",
              color: "var(--primaryButtonFill)",
              marginTop: "0.25rem",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
          >
            {open ? "Show less" : "Show more"}
          </span>
        )}
      </div>
    </>
  );
};

return RenderHTMLContent;
