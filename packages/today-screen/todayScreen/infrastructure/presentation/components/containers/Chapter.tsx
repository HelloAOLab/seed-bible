export interface Props {
  number: number;
  usersData: {
    name: string;
    pictureUrl?: string | undefined;
    color: string;
    icon: string;
    MaterialIcon: (props: {
      children: string;
      className?: string | undefined;
    }) => preact.JSX.Element;
  }[];
  handleClick: () => void;
}

const Icon = ({
  style,
  children,
}: {
  style: React.CSSProperties;
  children: React.ReactNode;
}) => {
  return <div style={style}>{children}</div>;
};

export const Chapter = ({ number, usersData, handleClick }: Props) => {
  return (
    <div
      className={`filtered-reading-chapter${usersData.length > 0 ? " filtered-reading-chapter-highlighted" : ""} clickable`}
      onClick={handleClick}
    >
      {number}
      {usersData.length > 0 && (
        <div>
          {usersData.map((data) => {
            return (
              <Icon
                style={{ backgroundColor: data.pictureUrl ? null : data.color }}
              >
                {data.pictureUrl ? (
                  <img src={data.pictureUrl} />
                ) : (
                  <data.MaterialIcon>{data.icon}</data.MaterialIcon>
                )}
              </Icon>
            );
          })}
        </div>
      )}
    </div>
  );
};
