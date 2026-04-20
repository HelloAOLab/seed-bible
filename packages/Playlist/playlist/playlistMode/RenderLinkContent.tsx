const G = globalThis as any;
if (G.RenderLinkTimer) clearTimeout(G.RenderLinkTimer);
if (G.NagiationTimeout) {
  clearTimeout(G.NagiationTimeout);
  G.NagiationTimeout = null;
}

G.RenderLinkTimer = setTimeout(async () => {
  const appName = "media-linked-playlist";

  const PlaylistMedia = thisBot.playlistContentRenderer();
  const { Modal, Button, ButtonsCover } = G.Components;
  DataManager.cancelCurrentPlayingSound();
  if (G.SetMediaURL && !that.skipEmbed) {
    G.SetMediaURL(null);
  }
  thisBot.CloseFloatingApp();

  if (G.SetVideoSrc && !that.skipEmbed) {
    G.SetVideoSrc(null);
    if (
      that.additionalInfo.type === "video-recording" ||
      that.additionalInfo.type === "video" ||
      that.additionalInfo.type === "Video"
    ) {
      thisBot.VideoPlayer({
        src: that.additionalInfo.link,
      });
      // globalThis.SetVideoSrc(that.additionalInfo.link);
      return;
    }
  }

  if (that.additionalInfo.type === "voice-recording") {
    const data = await web.get(that.additionalInfo.link);
    if (G.SetIncrementalCountPlayingPlaylist) {
      await G.SetIncrementalCountPlayingPlaylist(that.additionalInfo.link);
    }
    await DataManager.playSound({ data: data.data });
    return;
  }

  if (that.additionalInfo.type === "file") {
    const link = document.createElement("a");
    link.href = that.additionalInfo.link;

    // If same-origin → force download
    if (location.origin === new URL(that.additionalInfo.link).origin) {
      link.download = that.content; // suggest filename
    } else {
      // Cross-origin → `download` is ignored, so open in new tab
      link.target = "_blank";
      link.rel = "noopener";
    }

    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const data = that;

  // Let iFrame pass and render
  // if (data.additionalInfo.type === 'iframe') {
  //     if (globalThis.OpenRefTimeout) {
  //         clearTimeout(globalThis.OpenRefTimeout);
  //         globalThis.OpenRefTimeout = null;
  //     }
  //     globalThis.OpenRefTimeout = setTimeout(() => {
  //         const link = that.additionalInfo.link;
  //         const isVideo = globalThis.IsVideoAttachment(that);
  //         if (isVideo) {
  //             thisBot.VideoPlayer({
  //                 src: link
  //             })
  //             return;
  //         }
  //         globalThis.window?.open(
  //             link,
  //             "_blank",
  //             "noopener,noreferrer"
  //         );
  //     }, 200);
  //     return;
  // }

  if (data.additionalInfo.type === "externalLink") {
    if (G.OpenRefTimeout) {
      clearTimeout(G.OpenRefTimeout);
      G.OpenRefTimeout = null;
    }
    G.OpenRefTimeout = setTimeout(() => {
      const link = that.additionalInfo.link;
      const isVideo = G.IsVideoAttachment(that);
      if (isVideo) {
        thisBot.VideoPlayer({
          src: link,
        });
        return;
      }
      // globalThis.window?.open(
      //     link,
      //     "_blank",
      //     "noopener,noreferrer"
      // );
      G.SetOpenExternalLink && G.SetOpenExternalLink(link);
    }, 200);
    return;
  }

  if (data.additionalInfo.type === "youtube") {
    if (G.OpenRefTimeout) {
      clearTimeout(G.OpenRefTimeout);
      G.OpenRefTimeout = null;
    }
    G.OpenRefTimeout = setTimeout(() => {
      const link = data.additionalInfo.link;
      thisBot.VideoPlayer({
        src: link,
        isYoutube: true,
        videoID: data.additionalInfo.videoId,
        content: data.content,
      });
      return;
    }, 200);
    return;
  }

  // os.unregisterApp(appName);
  os.registerApp(appName, thisBot);

  const MediaLinkedPlaylist = () => {
    return (
      <Modal
        showIcon={false}
        title="Linked Items"
        styles={{ height: "calc(100% - 120px)" }}
        sxContainer={{ height: "98dvh", width: "98vw", zIndex: "9999999" }}
        onClose={() => {
          if (G.SmallPlaybackContent) G.SmallPlaybackContent();
          os.unregisterApp(appName);
        }}
      >
        <PlaylistMedia
          type={data.additionalInfo.type}
          content={data.content}
          link={data.additionalInfo.link}
          videoId={data.additionalInfo.videoId}
        />
        {G.PlayingPlaylist && (
          <ButtonsCover>
            {!that.isFirstItem ? (
              <Button
                style={{ minWidth: "100px", margin: "8px 0 0 0 " }}
                onClick={() => {
                  G.HandleOnButtonPress(-1);
                  os.unregisterApp(appName);
                }}
                backgroundColor="black"
              >
                {t("previous")}
              </Button>
            ) : (
              <p />
            )}
            {!that.isLastItem && (
              <Button
                style={{ minWidth: "100px", margin: "8px 0 0 0 " }}
                onClick={() => {
                  G.HandleOnButtonPress(1);
                  os.unregisterApp(appName);
                }}
                backgroundColor="black"
              >
                {t("next")}
              </Button>
            )}
          </ButtonsCover>
        )}
      </Modal>
    );
  };

  G.ModifyTransformedHistory &&
    G.PlayingPlaylist &&
    G.ModifyTransformedHistory((thh: any) => thisBot.checkGreyOut(thh));
  if (G.updateCustomHeight) G.updateCustomHeight(0);

  os.compileApp(appName, <MediaLinkedPlaylist />);
}, 50);
