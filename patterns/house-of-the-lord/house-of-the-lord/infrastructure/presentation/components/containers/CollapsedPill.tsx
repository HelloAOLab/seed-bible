import { useCollapsedPill } from "../../hooks/useCollapsedPill";

export interface UseCollapsedPillType {
  handleClick: () => void;
  text: string;
  icon: string;
}

export const CollapsedPill = () => {
  const { handleClick, text, icon } = useCollapsedPill();

  return (
    <button type="button" className="hotl-pill" onClick={handleClick}>
      <span aria-hidden="true">{icon}</span>
      <span>{text}</span>
    </button>
  );
};
