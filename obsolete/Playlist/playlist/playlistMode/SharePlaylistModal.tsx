const G = globalThis as any;
const { Modal, Button } = G.Components;
const RenderIcon = await thisBot.RenderIcon();

const playlistSharerName = that.playlistSharerName;

if (!playlistSharerName) return null;

os.unregisterApp("share-playlist-modal");
os.registerApp("share-playlist-modal", thisBot);

const onCloseSharPlaylistModal = () => {
  os.unregisterApp("share-playlist-modal");
};

const playlistShared: any = (G[`${"default"}playlists`] || []).find(
  (ele: any) => ele.id === G.hasASharedPlaylist
);

let currentProfileNameRef = "";
if (G.hasASharedPlaylist) {
  // const nameOfSharer = G.shareProfileName;
  let currentProfileName = "Guest";
  const authBot = await os.requestAuthBotInBackground();
  if (authBot?.id) {
    const data = await os.getData(thisBot.tags.keyFetchAccountData, authBot.id);
    if (data.success) {
      const payload = data.data;
      currentProfileName = payload.profileName || "Guest";
    }
  }
  currentProfileNameRef = currentProfileName;
  G.shareProfileName = false;
}

const SharePlaylistModal = () => {
  return (
    <>
      <style>{thisBot.tags["playlist.css"]}</style>
      <Modal
        sxContainer={{ width: "460px" }}
        title={false}
        showIcon={false}
        onClose={onCloseSharPlaylistModal}
      >
        <div className="welcome-box">
          <img
            src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/08ff23d5216230e0fe9b9c0f80b8192aee35c320d4c87e60046e7cc396d8f5a7.svg"
            alt="share"
          />
          <div className="align-center" style={{ gap: "1rem" }}>
            {G.shareProfilePic && (
              <img
                className="welcome-box-profile"
                src={G.shareProfilePic}
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
            onClick={() => {
              if (G.DragDrop)
                thisBot.Playlistplaying({
                  playingPlaylist: playlistShared.id,
                  startIndex: 0,
                  startSubIndex: -1,
                  parentId: "default",
                  name: playlistShared.name,
                });
              onCloseSharPlaylistModal();
              G.hasASharedPlaylist = false;
            }}
          >
            {t("begin")}
          </Button>
        </div>
      </Modal>
    </>
  );
};

os.compileApp("share-playlist-modal", <SharePlaylistModal />);
