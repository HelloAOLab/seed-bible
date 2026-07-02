const G = globalThis as Record<string, any>;

export function startEditingPlaylist(
  name: string,
  id: string,
  list: unknown,
  subId: unknown,
  attachment: unknown,
  checklistEnabled: boolean,
  parentId: string,
  readingPlanEnabled: boolean,
  currentFormat: string,
  color: string,
  icon: string,
  isCustomColor: boolean,
  description: string,
  isCustomIcon: boolean,
  selectedTags: unknown,
  isLayers: boolean,
  access: string
): void {
  G[`${parentId}SetPlaylistName`](name);
  G[`${parentId}creatingPlaylistName`] = name;
  G[`${parentId}HISTORYExploreMode`] = false;
  G[`${parentId}creatingPlaylist`] = true;
  G[`${parentId}isEditMode`] = id;
  G[`${parentId}isEditModeSubID`] = subId;
  G[`${parentId}SetAttachments`](attachment);
  G[`${parentId}Attachments`] = attachment;
  G[`${parentId}SetReadingPlan`](readingPlanEnabled);
  G[`${parentId}SetChecklist`](checklistEnabled);
  G[`${parentId}SetCurrentFormat`](currentFormat);
  G.SetEditData({
    color,
    id: parentId,
    name,
    description,
    icon,
  });

  if (isCustomColor) G[`${parentId}setCustomColor`](color);
  if (isCustomIcon) G[`${parentId}setCustomIcon`](icon);
  G[`${parentId}setSelectedColor`](color);
  G[`${parentId}setSelectedIcon`](icon);
  G[`${parentId}setDescription`](description);
  G[`${parentId}SetCreatingPlaylist`](true, list);
  G[`${parentId}SetSelectedTags`](selectedTags || []);
  G[`${parentId}SetLayers`](isLayers);
  G[`${parentId}setPublishAccess`](access);
}
