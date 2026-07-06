interface TitledSectionProps {
  children: React.ReactNode;
  title: string;
}

export const TitledSection = ({ title, children }: TitledSectionProps) => {
  return (
    <div className="titled-section">
      <h5>{title}</h5>
      {children}
    </div>
  );
};
