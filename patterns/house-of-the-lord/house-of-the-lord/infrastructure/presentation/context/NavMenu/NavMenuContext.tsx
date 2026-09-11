import type { ComponentChildren } from "preact";
import { useNavMenuProvider } from "./useNavMenuProvider";
import type {
  NavMenuProps,
  NavMenuContextType,
} from "../../../models/navigation";

const { createContext, useContext } = os.appHooks;

export interface NavMenuProviderProps {
  children: ComponentChildren;
  config: Pick<
    NavMenuProps,
    | "eventBus"
    | "getState"
    | "controller"
    | "catalog"
    | "verseReferences"
    | "bookNames"
  >;
}

const NavMenuContext = createContext<NavMenuContextType | undefined>(undefined);

export const NavMenuProvider = ({ children, config }: NavMenuProviderProps) => {
  const contextValue = useNavMenuProvider(config);

  return (
    <NavMenuContext.Provider value={contextValue}>
      {children}
    </NavMenuContext.Provider>
  );
};

export const useNavMenuContext = () => {
  const context = useContext(NavMenuContext);

  if (!context) {
    throw new Error("useNavMenuContext must be used within a NavMenuContext");
  }

  return context;
};
