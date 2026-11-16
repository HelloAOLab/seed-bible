import type { UseCollapsedPillType } from "../components/containers/CollapsedPill";
import { useNavMenuContext } from "../context/NavMenu/NavMenuContext";

type UseCollapsedPill = () => UseCollapsedPillType;
const { useCallback } = os.appHooks;

export const useCollapsedPill: UseCollapsedPill = () => {
  const { controller } = useNavMenuContext();

  const handleClick = useCallback(() => {
    controller.handleToggle();
  }, [controller]);

  const text = "Explore";
  const icon = "explore";

  return {
    handleClick,
    text,
    icon,
  };
};
