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
            return data.pictureUrl ? (
              <img src={data.pictureUrl} />
            ) : (
              <div style={{ backgroundColor: data.color }}>
                <data.MaterialIcon>{data.icon}</data.MaterialIcon>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
