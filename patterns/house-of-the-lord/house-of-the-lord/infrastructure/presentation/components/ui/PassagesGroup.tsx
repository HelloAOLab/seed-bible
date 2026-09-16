import { Passage, type PassageRow } from "../containers/Passage";

export interface PassagesGroupProps {
  title: string;
  passages: PassageRow[];
}

export const PassagesGroup = ({ title, passages }: PassagesGroupProps) => {
  if (passages.length === 0) return null;

  return (
    <>
      <div className="hotl-group-label">{title}</div>
      {passages.map((row) => (
        <Passage key={row.id} row={row} />
      ))}
    </>
  );
};
