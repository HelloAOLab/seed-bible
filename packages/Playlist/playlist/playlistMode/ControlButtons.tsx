const { useState, useLayoutEffect } = os.appHooks;
const { Button } = Components;
const { id } = that;

os.unregisterApp("controlButtons");
os.registerApp("controlButtons");

const resetState = () => {
  thisBot.resetEditingState({ id });
};

const ControlButtons = () => {
  const [open, setOpen] = useState(false);

  const hanldeCancelClick = () => {
    resetState();
  }

  return <div className={`control-container ${open && "opened"}`}>
    <div onClick={() => setOpen((p) => !p)} className="control">
      <span class="material-symbols-outlined unfollow">
        {open ? "close" : "settings"}
      </span>
    </div>
    <div className="control-actions">
      <Button onClick={() => {
        thisBot.tryAddPlaylistToPlaylists();
        resetState();
      }} style={{ marginRight: "10px" }}>Save</Button>
      <Button onClick={hanldeCancelClick} >Cancel</Button>
    </div>
  </div>
}

// os.compileApp("controlButtons", <ControlButtons/>);

return {
  onSave: (attachment, checklist, readingPlan, currentFormat, color, icon, isCustomColor, description, isCustomIcon, selectedTags, isLayers, access, onClose) => {
    thisBot.tryAddPlaylistToPlaylists({ attachment, checklist, id, readingPlan, currentFormat, color, icon, isCustomColor, description, isCustomIcon, selectedTags, isLayers, access });
    globalThis.SelectedItemIDForAttachments = null;
    setTimeout(() => {
      resetState();
      if (onClose) onClose();
    }, 100);
  },
  onClose: () => {
    resetState();
  }
}