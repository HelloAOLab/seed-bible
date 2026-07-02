import { RenderIcon } from "ext_discover.components.RenderIcon";
import { playlistCss } from "ext_discover.css.playlistCss";
import type { SharePlaylistModalProps } from "ext_discover.interfaces.components.SharePlaylistModal";
import { Modal } from "ext_discover.features.components.Modal";
import { Button } from "ext_discover.features.components.Button";

export function SharePlaylistModal({ manager }: SharePlaylistModalProps) {
  const playlistSharerName = manager.playlistSharerName;
  const playlistShared = manager.playlistShared;
  const shareProfilePic = manager.shareProfilePic;

  if (!playlistShared) return null;

  return (
    <>
      <style>{playlistCss}</style>
      <Modal
        sxContainer={{ width: "460px" }}
        title={false}
        showIcon={false}
        onClose={manager.close}
      >
        <div className="welcome-box">
          <img
            src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/08ff23d5216230e0fe9b9c0f80b8192aee35c320d4c87e60046e7cc396d8f5a7.svg"
            alt="share"
          />
          <div className="align-center" style={{ gap: "1rem" }}>
            {shareProfilePic && (
              <img
                className="welcome-box-profile"
                src={shareProfilePic}
                alt={playlistSharerName}
              />
            )}
            {playlistSharerName ? (
              <p>
                {" "}
                <b>{playlistSharerName}</b> {t("sharedAPlaylist")}
              </p>
            ) : (
              <p>{t("hereIsYourSharedPlaylist")}</p>
            )}
          </div>
          <div
            className="welcome-box-content"
            style={{
              alignItems: !playlistShared.description ? "center" : "flex-start",
            }}
          >
            <RenderIcon
              isCustomIcons={playlistShared.isCustomIcon}
              icon={playlistShared.icon}
              list={playlistShared.list}
            />
            <div className="welcome-details">
              <h4
                style={{
                  fontSize: playlistShared.description ? "1rem" : "1.125rem",
                }}
              >
                {playlistShared.name}
              </h4>
              {!!playlistShared.description && (
                <p>{playlistShared.description}</p>
              )}
            </div>
          </div>
          <Button
            secondary
            style={{
              width: "205px",
            }}
            onClick={manager.begin}
          >
            {t("begin")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
