import type {
  PiecesGroupData,
  UsePiecesContainerType,
} from "../components/containers/PiecesContainer";
import { useNavMenuContext } from "../context/NavMenu/NavMenuContext";

const { useState, useMemo, useCallback } = os.appHooks;

type UsePiecesContainer = () => UsePiecesContainerType;

export const usePiecesContainer: UsePiecesContainer = () => {
  const { menuState, catalog, controller } = useNavMenuContext();

  const groups = useMemo(
    () => catalog.getGroups(menuState.experience),
    [catalog, menuState.experience]
  );

  const [foldedGroups, setFoldedGroups] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(groups.map((group) => [group.id, group.startsFolded]))
  );

  const toggleGroup = useCallback(
    (id: string) =>
      setFoldedGroups((folded) => ({ ...folded, [id]: !folded[id] })),
    []
  );

  const piecesGroups = useMemo<PiecesGroupData[]>(
    () =>
      groups.map((group) => ({
        key: group.id,
        group,
        isFolded: foldedGroups[group.id] ?? false,
        onToggle: () => toggleGroup(group.id),
      })),
    [groups, foldedGroups, toggleGroup]
  );

  const handleOcclusionResetButtonClick = useCallback(
    () => controller.handleShowEverything(),
    [controller]
  );

  const occlusionResetButtonText = "Show everything";

  return {
    piecesGroups,
    handleOcclusionResetButtonClick,
    occlusionResetButtonText,
  };
};
