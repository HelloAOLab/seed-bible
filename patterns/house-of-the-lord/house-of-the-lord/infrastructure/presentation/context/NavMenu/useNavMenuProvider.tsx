import type { NavigationState } from "../../../../domain/models/navigation";
import type {
  NavMenuProps,
  NavMenuContextType,
} from "../../../models/navigation";

const { useState, useEffect } = os.appHooks;

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

  useEffect(() => {
    const unsubscribe = eventBus.subscribe(
      "OnNavigationStateChanged",
      ({ state }) => {
        setMenuState(state);
      }
    );

    // Subscribing first and reading after leaves no gap: anything emitted
    // between the first render and this effect is picked up here instead of
    // sitting unseen until the next unrelated change.
    setMenuState(getState());

    return () => unsubscribe();
  }, []);

  return {
    menuState,
    controller,
    catalog,
    verseReferences,
    bookNames,
  };
};
