import type { UseNavMenuHeaderType } from "../components/containers/NavMenuHeader";
import { useNavMenuContext } from "../context/NavMenu/NavMenuContext";

const { useCallback } = os.appHooks;

type UseNavMenuHeader = () => UseNavMenuHeaderType;

export const useNavMenuHeader: UseNavMenuHeader = () => {
  const { controller } = useNavMenuContext();

  const handleBack = useCallback(() => {
    controller.handleShowPieceList();
  }, [controller]);

  const handleClose = useCallback(() => {
    controller.handleClose();
  }, [controller]);

  const backIcon = "←";
  const closeIcon = "✕";

  return {
    handleBack,
    handleClose,
    backIcon,
    closeIcon,
  };
};
