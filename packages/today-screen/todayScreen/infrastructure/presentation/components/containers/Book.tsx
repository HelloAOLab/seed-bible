import { useBook } from "../../hooks/useBook";
import { Chapter, type Props as ChapterProps } from "./Chapter";

export interface BookProps {
  bookId: string;
  chaptersReading: {
    [chapter: number]: string[];
  };
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

export interface ChapterData extends ChapterProps {
  key: string;
}

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

export const Book = (props: BookProps) => {
  const {
    name,
    /* chapter, */
    usersIconData,
    extraUsers,
    isExpanded,
    handleBookClick,
    chaptersData,
  } = useBook(props);

  return (
    <div
      className={`filtered-reading-book${isExpanded ? " expanded" : ""}`}
      onClick={handleBookClick}
    >
      <span>{name}</span>
      <div className="icons-container">
        {usersIconData.map(({ key, ...rest }) => (
          <UserIcon key={key} {...rest} />
        ))}
        {extraUsers && (
          <span className="filtered-reading-book-extra">{`+${extraUsers}`}</span>
        )}
      </div>
      {isExpanded && (
        <div className="chapters-container">
          {chaptersData.map(({ key, ...rest }) => {
            return <Chapter key={key} {...rest} />;
          })}
        </div>
      )}
    </div>
  );
};
