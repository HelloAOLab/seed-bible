import { NAV_MENU_LEVELS } from "../../../domain/models/navigation";
import type { UseNavMenuContentType } from "../components/containers/NavMenuContent";
import { useNavMenuContext } from "../context/NavMenu/NavMenuContext";

type UseNavMenuContent = () => UseNavMenuContentType;

export const useNavMenuContent: UseNavMenuContent = () => {
  const { menuState, catalog } = useNavMenuContext();

  const isDetail =
    menuState.level === NAV_MENU_LEVELS.PIECE_DETAIL &&
    menuState.selectedPiece !== null;

  const title =
    isDetail && menuState.selectedPiece
      ? catalog.getPieceLabel(menuState.experience, menuState.selectedPiece)
      : menuState.experience;

  return {
    isDetail,
    title,
  };
};
