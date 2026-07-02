import { resetEditingState } from "ext_discover.helper.resetEditingState";
import { tryAddPlaylistToPlaylists } from "ext_discover.helper.tryAddPlaylistToPlaylists";

const { useState } = os.appHooks;
const G = globalThis as any;
const { Button } = G.Components;
const { id } = that;

os.unregisterApp("controlButtons");
os.registerApp("controlButtons", thisBot);

const resetState = () => {
  resetEditingState({ id }, thisBot);
};

const ControlButtons = () => {
  const [open, setOpen] = useState(false);

  const hanldeCancelClick = () => {};

  return (
    <div className={`control-container ${open && "opened"}`}>
      <div onClick={() => setOpen((p) => !p)} className="control">
        <span class="material-symbols-outlined unfollow">
          {open ? "close" : "settings"}
        </span>
      </div>
      <div className="control-actions">
        <Button
          onClick={() => {
            tryAddPlaylistToPlaylists();
            resetState();
          }}
          style={{ marginRight: "10px" }}
        >
          Save
        </Button>
        <Button onClick={hanldeCancelClick}>Cancel</Button>
      </div>
    </div>
  );
};

// os.compileApp("controlButtons", <ControlButtons/>);

return {
  onSave: (
    attachment: any,
    checklist: any,
    readingPlan: any,
    currentFormat: any,
    color: any,
    icon: any,
    isCustomColor: any,
    description: any,
    isCustomIcon: any,
    selectedTags: any,
    isLayers: any,
    access: any,
    onClose: any
  ) => {
    tryAddPlaylistToPlaylists({
      attachment,
      checklist,
      id,
      readingPlan,
      currentFormat,
      color,
      icon,
      isCustomColor,
      description,
      isCustomIcon,
      selectedTags,
      isLayers,
      access,
    });
    G.SelectedItemIDForAttachments = null;
    setTimeout(() => {
      resetState();
      if (onClose) onClose();
    }, 100);
  },
  onClose: () => {
    resetState();
  },
};
