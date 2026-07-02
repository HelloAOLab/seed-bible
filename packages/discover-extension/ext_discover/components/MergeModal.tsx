import type { MergeModalProps } from "ext_discover.interfaces.components.MergeModal";
import { Modal } from "ext_discover.features.components.Modal";
import { Button } from "ext_discover.features.components.Button";
import { ButtonsCover } from "ext_discover.features.components.ButtonsCover";

export function MergeModal({ manager }: MergeModalProps) {
  const selected = manager.selected.value;
  const playlists = manager.filteredPlaylists.value;

  return (
    <Modal showIcon={false} title="Merge Playlist" onClose={manager.close}>
      <p style={{ fontSize: "12px" }}>
        <b>Select Playlist to Merge Into:</b>
      </p>
      {playlists.map((ele) => (
        <div
          key={ele.id}
          style={{ display: "flex", cursor: "pointer", alignItems: "center" }}
          onClick={() => {
            manager.selected.value = ele.id;
          }}
        >
          <input
            style={{ marginRight: "10px" }}
            type="radio"
            checked={selected === ele.id}
            readOnly
          />
          <h4
            className="playlist-action"
            style={{ display: "flex", alignItems: "center" }}
          >
            <b>{ele.name}</b>
          </h4>
        </div>
      ))}
      <ButtonsCover>
        <Button onClick={manager.close} secondaryAlt>
          Close
        </Button>

        <Button secondary isDisabled={!selected.trim()} onClick={manager.merge}>
          ↬↫ Merge
        </Button>
      </ButtonsCover>
    </Modal>
  );
}
