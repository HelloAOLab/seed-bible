import { useFilteredReadingBook } from "../../hooks/useFilteredReadingBook";

export interface BookProps {
  bookId: string;
  chapter: number;
  usersId: string[];
}

export type UserIconProps = {
  pictureUrl?: string;
  color: string;
  icon: string;
  MaterialIcon: (props: {
    children: string;
    className?: string | undefined;
  }) => preact.JSX.Element;
};

export type UserIconData = UserIconProps & {
  key: string;
};

const UserIcon = (props: UserIconProps) => {
  if (props.pictureUrl) {
    return <></>;
  }

  return (
    <div
      className="filtered-reading-book-icon"
      style={{ backgroundColor: props.color }}
    >
      <props.MaterialIcon>{props.icon}</props.MaterialIcon>
    </div>
  );
};

export const FilteredReadingBook = (props: BookProps) => {
  const { name, chapter, usersIconData, extraUsers } =
    useFilteredReadingBook(props);

  return (
    <div className="filtered-reading-book">
      <span>{`${name} ${chapter}`}</span>
      <div>
        {usersIconData.map(({ key, ...rest }) => (
          <UserIcon key={key} {...rest} />
        ))}
        {extraUsers && (
          <span className="filtered-reading-book-extra">{`+${extraUsers}`}</span>
        )}
      </div>
    </div>
  );
};
