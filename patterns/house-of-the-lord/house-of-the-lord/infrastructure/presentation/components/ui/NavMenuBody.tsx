import { PassagesContainer } from "../containers/PassagesContainer";
import { PiecesContainer } from "../containers/PiecesContainer";

export interface NavMenuBodyProps {
  isDetail: boolean;
}

export const NavMenuBody = ({ isDetail }: NavMenuBodyProps) => {
  return (
    <div className="hotl-panel-body">
      {isDetail ? <PassagesContainer /> : <PiecesContainer />}
    </div>
  );
};
