import type { NavMenuProps } from "../../models/navigation";
import { NavMenuProvider } from "../context/NavMenu/NavMenuContext";
import { NavMenuContainer } from "../components/containers/NavMenuContainer";

export const NavMenu = ({
  eventBus,
  getState,
  environment,
  themeEventBus,
  getThemeCss,
  controller,
  catalog,
  verseReferences,
  bookNames,
}: NavMenuProps) => {
  return (
    <NavMenuProvider
      config={{
        eventBus,
        getState,
        controller,
        catalog,
        verseReferences,
        bookNames,
      }}
    >
      <NavMenuContainer
        environment={environment}
        getThemeCss={getThemeCss}
        themeEventBus={themeEventBus}
      />
    </NavMenuProvider>
  );
};
