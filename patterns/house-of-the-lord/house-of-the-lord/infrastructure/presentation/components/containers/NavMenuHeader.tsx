import { useNavMenuHeader } from "../../hooks/useNavMenuHeader";

export interface NavMenuHeaderProps {
  isDetail: boolean;
  title: string;
}

export interface UseNavMenuHeaderType {
  handleBack: () => void;
  handleClose: () => void;
  backIcon: string;
  closeIcon: string;
}

export const NavMenuHeader = ({ isDetail, title }: NavMenuHeaderProps) => {
  const { handleBack, handleClose, backIcon, closeIcon } = useNavMenuHeader();

  return (
    <div className="hotl-panel-head">
      {isDetail ? (
        <button
          type="button"
          className="hotl-icon-button"
          aria-label="Back to the piece list"
          onClick={handleBack}
        >
          {backIcon}
        </button>
      ) : null}
      <span className="hotl-panel-title">{title}</span>
      <button
        type="button"
        className="hotl-icon-button"
        aria-label="Close the explore menu"
        onClick={handleClose}
      >
        {closeIcon}
      </button>
    </div>
  );
};
