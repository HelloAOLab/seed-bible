import type { PieceCatalogGroup } from "../../../../application/ports/out/PieceCatalog";
import type { PieceKey } from "../../../../domain/models/piece";
import { usePiecesGroup } from "../../hooks/usePiecesGroup";
import { Piece, type PieceProps } from "../ui/Piece";

export interface PiecesGroupProps {
  group: PieceCatalogGroup;
  isFolded: boolean;
  onToggle: () => void;
}

export interface PieceData extends PieceProps {
  key: PieceKey;
}

export interface UsePiecesGroupType {
  pieces: PieceData[];
  toggleIcon: string;
  toggleLabel: string;
}

const Toggle = ({
  handleClick,
  isFolded,
  icon,
  label,
}: {
  handleClick: () => void;
  isFolded: boolean;
  icon: UsePiecesGroupType["toggleIcon"];
  label: UsePiecesGroupType["toggleLabel"];
}) => {
  return (
    <button
      type="button"
      className="hotl-group"
      aria-expanded={!isFolded}
      onClick={handleClick}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );
};

export const PiecesGroup = ({
  group,
  isFolded,
  onToggle,
}: PiecesGroupProps) => {
  const { pieces, toggleIcon, toggleLabel } = usePiecesGroup({
    isFolded,
    group,
  });

  return (
    <div>
      <Toggle
        handleClick={onToggle}
        isFolded={isFolded}
        icon={toggleIcon}
        label={toggleLabel}
      />
      {!isFolded && pieces.map((piece) => <Piece {...piece} />)}
    </div>
  );
};
