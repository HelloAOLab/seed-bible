import type { VerseRange } from "../../../../domain/models/scripture";
import { usePassage } from "../../hooks/usePassage";

export interface PassageRow {
  id: string;
  label: string;
  target: VerseRange;
}

export interface PassageProps {
  row: PassageRow;
}

export interface UsePassageType {
  handleClick: () => void;
}

export const Passage = ({ row }: PassageProps) => {
  const { handleClick } = usePassage(row);

  return (
    <button type="button" className="hotl-passage" onClick={handleClick}>
      {row.label}
    </button>
  );
};
