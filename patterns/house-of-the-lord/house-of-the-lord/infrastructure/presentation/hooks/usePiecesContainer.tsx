import type {
  PiecesGroupData,
  UsePiecesContainerType,
} from "../components/containers/PiecesContainer";
import { useNavMenuContext } from "../context/NavMenu/NavMenuContext";

const { useMemo, useCallback } = os.appHooks;

type UsePiecesContainer = () => UsePiecesContainerType;

export const usePiecesContainer: UsePiecesContainer = () => {
  const { menuState, catalog, controller, foldedGroups, toggleGroup } =
    useNavMenuContext();

  const groups = useMemo(
    () => catalog.getGroups(menuState.experience),
    [catalog, menuState.experience]
  );

  const piecesGroups = useMemo<PiecesGroupData[]>(
    () =>
      groups.map((group) => ({
        key: group.id,
        group,
        isFolded: foldedGroups[group.id] ?? group.startsFolded,
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
