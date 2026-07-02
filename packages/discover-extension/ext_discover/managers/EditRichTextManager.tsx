import { signal } from "@preact/signals";
import type { EditRichTextManager } from "ext_discover.interfaces.managers.EditRichTextManager";

const G = globalThis as Record<string, any>;

const managersByScope = new Map<string, EditRichTextManager>();

export function getEditRichTextManager(scope = "default"): EditRichTextManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createEditRichTextManager(scope);
  managersByScope.set(scope, manager);
  return manager;
}

function createEditRichTextManager(playlistId: string): EditRichTextManager {
  const name = signal("");
  const quotedText = signal(false);
  const contentId = { current: "" };
  const parentID = { current: "" };

  const syncProps: EditRichTextManager["syncProps"] = (props) => {
    contentId.current = props.contentId;
    parentID.current = props.parentID;
    if (props.text !== undefined) name.value = props.text;
    if (props.isQuotedText !== undefined) quotedText.value = props.isQuotedText;
  };

  const onSave = (onClose: () => void) => {
    G[`${playlistId}EditPlaylistData`]?.(
      contentId.current,
      name.value,
      parentID.current,
      false,
      quotedText.value
    );
    onClose();
  };

  return {
    name,
    quotedText,
    onSave,
    syncProps,
  };
}
