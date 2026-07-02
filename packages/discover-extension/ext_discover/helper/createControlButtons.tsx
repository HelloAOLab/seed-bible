import { resetEditingState } from "ext_discover.helper.resetEditingState";
import { tryAddPlaylistToPlaylists } from "ext_discover.helper.tryAddPlaylistToPlaylists";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export function createControlButtons(opts: {
  id: string;
  thisBot?: Record<string, any>;
}) {
  const { id } = opts;
  const thisBot = opts.thisBot ?? getPlaylistBot();

  const resetState = () => {
    resetEditingState({ id }, thisBot);
  };

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
}
