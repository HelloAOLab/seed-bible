import { useBook } from "../../hooks/useBook";
import { Chapter, type Props as ChapterProps } from "./Chapter";
import { UserIcon, type UserIconProps } from "../ui/UserIcon";

export interface BookProps {
  bookId: string;
  chaptersReading: {
    [chapter: number]: string[];
  };
  usersId: string[];
}

export interface ChapterData extends ChapterProps {
  key: string;
}

export type UserIconData = UserIconProps & {
  key: string;
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
      className={`filtered-reading-book${isExpanded ? " expanded" : ""} clickable`}
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
        <div
          className="chapters-container"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {chaptersData.map(({ key, ...rest }) => {
            return <Chapter key={key} {...rest} />;
          })}
        </div>
      )}
    </div>
  );
};
