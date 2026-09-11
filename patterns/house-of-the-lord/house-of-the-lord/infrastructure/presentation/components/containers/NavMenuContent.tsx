import { useNavMenuContent } from "../../hooks/useNavMenuContent";
import { NavMenuHeader } from "./NavMenuHeader";
import { NavMenuBody } from "../ui/NavMenuBody";

export interface UseNavMenuContentType {
  isDetail: boolean;
  title: string;
}

export const NavMenuContent = () => {
  const { isDetail, title } = useNavMenuContent();

  return (
    <div className="hotl-panel">
      <NavMenuHeader isDetail={isDetail} title={title} />
      <NavMenuBody isDetail={isDetail} />
    </div>
  );
};
