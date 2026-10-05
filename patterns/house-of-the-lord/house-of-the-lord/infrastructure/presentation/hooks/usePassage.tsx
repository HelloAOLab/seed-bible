import type {
  PassageRow,
  UsePassageType,
} from "../components/containers/Passage";
import { useNavMenuContext } from "../context/NavMenu/NavMenuContext";

const { useCallback } = os.appHooks;

type UsePassage = (row: PassageRow) => UsePassageType;

export const usePassage: UsePassage = (row) => {
  const { controller } = useNavMenuContext();

  const handleClick = useCallback(
    () => controller.handlePassageClick(row.target),
    [controller, row.target]
  );

  return {
    handleClick,
  };
};
