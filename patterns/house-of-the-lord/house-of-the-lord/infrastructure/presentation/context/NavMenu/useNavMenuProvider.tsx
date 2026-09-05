import type { NavigationState } from "../../../../domain/models/navigation";
import type {
  NavMenuProps,
  NavMenuContextType,
} from "../../../models/navigation";

const { useState, useEffect, useCallback } = os.appHooks;

type UseNavMenuProvider = (
  config: Pick<
    NavMenuProps,
    | "eventBus"
    | "getState"
    | "controller"
    | "catalog"
    | "verseReferences"
    | "bookNames"
  >
) => NavMenuContextType;

export const useNavMenuProvider: UseNavMenuProvider = (config) => {
  const {
    getState,
    eventBus,
    controller,
    catalog,
    verseReferences,
    bookNames,
  } = config;

  const [menuState, setMenuState] = useState<NavigationState>(getState());

  const [foldedGroups, setFoldedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = useCallback(
    (id: string) =>
      setFoldedGroups((folded) => ({ ...folded, [id]: !folded[id] })),
    []
  );

  useEffect(() => {
    const unsubscribe = eventBus.subscribe(
      "OnNavigationStateChanged",
      ({ state }) => {
        setMenuState(state);
      }
    );

    setMenuState(getState());

    return () => unsubscribe();
  }, []);

  return {
    menuState,
    controller,
    catalog,
    verseReferences,
    bookNames,
    foldedGroups,
    toggleGroup,
  };
};
