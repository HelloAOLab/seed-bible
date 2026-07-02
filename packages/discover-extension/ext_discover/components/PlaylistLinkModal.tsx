import { PlaylistLinkedContainer } from "ext_discover.components.PlaylistLinkedContainer";
import type { PlaylistLinkModalProps } from "ext_discover.interfaces.components.PlaylistLinkModal";
import { Input } from "ext_discover.features.components.Input";
import { Modal } from "ext_discover.features.components.Modal";
import { Button } from "ext_discover.features.components.Button";
import { ButtonsCover } from "ext_discover.features.components.ButtonsCover";
import { Select } from "ext_discover.features.components.Select";

const ButtonStyle = {
  cursor: "pointer",
  border: "1px solid grey",
  borderRadius: "40px",
  padding: "6px",
  fontSize: "14px",
  marginLeft: "4px",
};

export function PlaylistLinkModal({ manager }: PlaylistLinkModalProps) {
  const collection = manager.collection.value;
  const initialName = manager.initialName.value;
  const addList = manager.addList.value;
  const playbackListID = manager.playbackListID.value;
  const playlistId = manager.playlistId.value;
  const playbackOptions = manager.getPlaybackOptions();
  const playlistOptions = manager.getPlaylistOptions();

  return (
    <>
      <Modal
        sxContainer={{ width: "auto" }}
        title={initialName ? "Edit Your Collection" : "Add To Collection"}
        showIcon={false}
        styles={{
          width: `${Math.max(collection.length ? 1 : 1, 1) * 396 + 36}px`,
        }}
        onClose={manager.close}
      >
        <Input
          value={manager.name.value}
          onChangeListener={(val: string) => {
            manager.name.value = val;
          }}
          placeholder="Collection's Name"
        />
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexDirection: "column",
          }}
        >
          {collection.map((coll) => (
            <div
              key={coll.id}
              style={{
                display: "flex",
                flexDirection: "column",
                maxHeight: "90dvh",
                width: "100%",
                overflow: "auto",
                position: "relative",
              }}
            >
              <PlaylistLinkedContainer playlist={coll} />
              <span
                class="material-symbols-outlined unfollow"
                style={{
                  position: "absolute",
                  top: "15px",
                  right: "15px",
                  background: "white",
                  ...ButtonStyle,
                }}
                onClick={() => manager.removeFromCollection(coll.id)}
              >
                delete
              </span>
            </div>
          ))}
        </div>
        <ButtonsCover>
          <Button
            secondary
            isDisabled={!manager.name.value}
            onClick={manager.saveCollections}
          >
            {t("save")}
          </Button>
          <Button
            onClick={() => {
              manager.addList.value = true;
            }}
            secondary
          >
            {collection.length > 1
              ? t("addAnotherPlaylist")
              : t("addAPlaylist")}
          </Button>
          <Button onClick={manager.close} secondaryAlt>
            {t("close")}
          </Button>
        </ButtonsCover>
      </Modal>

      {addList && (
        <Modal showIcon={false} onClose={manager.onCloseAddList}>
          <h4>{t("addAnotherPlaylist")}:</h4>
          <div style={{ paddingTop: "4px" }}>
            <Select
              secondary
              value={playbackListID}
              onChangeListener={(val: string) => {
                manager.playbackListID.value = val;
                manager.playlistId.value = "";
              }}
              name={t("selectPlaybackList") + ":"}
              options={[
                { disabled: true, value: "", label: t("selectParallelList") },
                ...playbackOptions,
              ]}
            />
          </div>
          <div style={{ paddingTop: "4px" }}>
            <Select
              secondary
              disabled={playlistOptions.length < 1}
              value={playlistId}
              onChangeListener={(val: string) => {
                manager.playlistId.value = val;
              }}
              name={t("selectPlaylist") + ":"}
              options={[
                { disabled: true, value: "", label: t("selectPlaylistList") },
                ...playlistOptions,
              ]}
            />
          </div>

          <ButtonsCover>
            <Button onClick={manager.onCloseAddList} secondaryAlt>
              {t("close")}
            </Button>

            <Button
              secondary
              isDisabled={!playlistId}
              onClick={manager.addPlaylistToCollection}
            >
              {t("add")}
            </Button>
          </ButtonsCover>
        </Modal>
      )}
    </>
  );
}
