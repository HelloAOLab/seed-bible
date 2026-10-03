import type { ComponentChildren } from "preact";

interface TitledSectionProps {
  children: React.ReactNode;
  title: string;
  buttonData?: {
    label: string;
    onClick: () => void;
  };
  /** Arbitrary header control, for a section whose action isn't a text link. */
  action?: ComponentChildren;
}

export const TitledSection = ({
  title,
  buttonData,
  action,
  children,
}: TitledSectionProps) => {
  return (
    <div className="sb-today-titled-section">
      <div className={"sb-today-titled-section-header"}>
        <h5>{title}</h5>
        {buttonData && (
          <button onClick={buttonData.onClick}>{buttonData.label}</button>
        )}
        {action}
      </div>
      {children}
    </div>
  );
};
