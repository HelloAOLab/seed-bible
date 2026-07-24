interface TitledSectionProps {
  children: React.ReactNode;
  title: string;
  buttonData?: {
    label: string;
    onClick: () => void;
  };
}

export const TitledSection = ({
  title,
  buttonData,
  children,
}: TitledSectionProps) => {
  return (
    <div className="titled-section">
      <div className={"titled-section-header"}>
        <h5>{title}</h5>
        {buttonData && (
          <button onClick={buttonData.onClick}>{buttonData.label}</button>
        )}
      </div>
      {children}
    </div>
  );
};
