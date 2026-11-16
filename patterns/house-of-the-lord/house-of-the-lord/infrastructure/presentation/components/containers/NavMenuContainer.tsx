import type { EnvironmentAdapter } from "../../../adapters/casualos/EnvironmentAdapter";
import { useNavMenuContainer } from "../../hooks/useNavMenuContainer";
import type { InfrastructureEventPort } from "../../../models/events";
import { useNavMenuContext } from "../../context/NavMenu/NavMenuContext";
import { NavMenuContent } from "./NavMenuContent";
import { CollapsedPill } from "./CollapsedPill";

export interface NavMenuContainerProps {
  getThemeCss: () => string;
  environment: EnvironmentAdapter;
  themeEventBus: InfrastructureEventPort;
}

export interface UseNavMenuContainerType {
  themeCss: string;
  styles: string;
  handlePointerEnter: () => void;
  handlePointerLeave: () => void;
}

export const NavMenuContainer = ({
  getThemeCss,
  environment,
  themeEventBus,
}: NavMenuContainerProps) => {
  const { menuState } = useNavMenuContext();
  const { themeCss, styles, handlePointerEnter, handlePointerLeave } =
    useNavMenuContainer({
      environment,
      themeEventBus,
      getThemeCss,
    });
  return (
    <>
      {themeCss ? <style>{themeCss}</style> : null}
      <style>{styles}</style>
      <link
        href="https://fonts.googleapis.com/icon?family=Material+Icons"
        rel="stylesheet"
      />
      <div
        className="hotl-nav"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {menuState.isOpen ? <NavMenuContent /> : <CollapsedPill />}
      </div>
    </>
  );
};
