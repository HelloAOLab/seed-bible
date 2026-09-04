import type { ComponentChild } from "preact";
import { useNavMenuContext } from "../../context/NavMenu/NavMenuContext";
import { usePiecesContainer } from "../../hooks/usePiecesContainer";
import { PiecesGroup, type PiecesGroupProps } from "./PiecesGroup";

export interface PiecesGroupData extends PiecesGroupProps {
  key: string;
}

export interface UsePiecesContainerType {
  piecesGroups: PiecesGroupData[];
  handleOcclusionResetButtonClick: () => void;
  occlusionResetButtonText: string;
}

const OcclusionResetButton = ({
  handleClick,
  children,
}: {
  handleClick: UsePiecesContainerType["handleOcclusionResetButtonClick"];
  children: ComponentChild;
}) => {
  return (
    <button type="button" className="hotl-reset" onClick={handleClick}>
      {children}
    </button>
  );
};

export const PiecesContainer = () => {
  const { menuState } = useNavMenuContext();
  const {
    piecesGroups,
    handleOcclusionResetButtonClick,
    occlusionResetButtonText,
  } = usePiecesContainer();

  return (
    <>
      {menuState.occludedBy && (
        <OcclusionResetButton handleClick={handleOcclusionResetButtonClick}>
          {occlusionResetButtonText}
        </OcclusionResetButton>
      )}
      {piecesGroups.map((piecesGroup) => (
        <PiecesGroup {...piecesGroup} />
      ))}
    </>
  );
};
