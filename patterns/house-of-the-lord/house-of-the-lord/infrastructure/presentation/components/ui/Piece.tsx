import type { ComponentChild } from "preact";

export interface PieceProps {
  className: string;
  onClick: () => void;
  children: ComponentChild;
}

export const Piece = ({ className, onClick, children }: PieceProps) => {
  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
};
