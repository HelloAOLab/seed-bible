import { CloseFloatingApp } from "ext_discover.helper.CloseFloatingApp";
import { checkGreyOut } from "ext_discover.helper.checkGreyOut";
import { openVideoPlayer } from "ext_discover.helper.openVideoPlayer";
import { PlaylistContentRenderer } from "ext_discover.components.PlaylistContentRenderer";
import type { RenderLinkContentItem } from "ext_discover.interfaces.helper.renderLinkContent";
import { Modal } from "ext_discover.features.components.Modal";
import { Button } from "ext_discover.features.components.Button";
import { ButtonsCover } from "ext_discover.features.components.ButtonsCover";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export function renderLinkContent(that: RenderLinkContentItem) {
  if (G.RenderLinkTimer) clearTimeout(G.RenderLinkTimer);
  if (G.NagiationTimeout) {
    clearTimeout(G.NagiationTimeout);
    G.NagiationTimeout = null;
  }

  G.RenderLinkTimer = setTimeout(async () => {
    const appName = "media-linked-playlist";
    DataManager.cancelCurrentPlayingSound();
    if (G.SetMediaURL && !that.skipEmbed) {
      G.SetMediaURL(null);
    }
    CloseFloatingApp();

    if (G.SetVideoSrc && !that.skipEmbed) {
      G.SetVideoSrc(null);
      if (
        that.additionalInfo.type === "video-recording" ||
        that.additionalInfo.type === "video" ||
        that.additionalInfo.type === "Video"
      ) {
        openVideoPlayer({
          src: that.additionalInfo.link,
        });
        return;
      }
    }

    if (that.additionalInfo.type === "voice-recording") {
      const data = await web.get(that.additionalInfo.link);
      if (G.SetIncrementalCountPlayingPlaylist) {
        await G.SetIncrementalCountPlayingPlaylist(that.additionalInfo.link);
        G.SetFileName && G.SetFileName(that.content);
      }
      await DataManager.playSound({ data: data.data });
      return;
    }

    if (that.additionalInfo.type === "file") {
      const link = document.createElement("a");
      link.href = that.additionalInfo.link;

      if (location.origin === new URL(that.additionalInfo.link).origin) {
        link.download = that.content;
      } else {
        link.target = "_blank";
        link.rel = "noopener";
      }

      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    const data = that;

    if (data.additionalInfo.type === "externalLink") {
      if (G.OpenRefTimeout) {
        clearTimeout(G.OpenRefTimeout);
        G.OpenRefTimeout = null;
      }
      G.OpenRefTimeout = setTimeout(() => {
        const link = that.additionalInfo.link;
        const isVideo = G.IsVideoAttachment(that);
        if (isVideo) {
          openVideoPlayer({
            src: link,
          });
          return;
        }
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
        openVideoPlayer({
          src: data.additionalInfo.link,
          isYoutube: true,
          videoID: data.additionalInfo.videoId,
          content: data.content,
        });
      }, 200);
      return;
    }

    os.unregisterApp(appName);
    os.registerApp(appName, getPlaylistBot());

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
          <PlaylistContentRenderer
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
      G.ModifyTransformedHistory((thh: any) => checkGreyOut(thh));
    if (G.updateCustomHeight) G.updateCustomHeight(0);

    os.compileApp(appName, <MediaLinkedPlaylist />);
  }, 50);
}
