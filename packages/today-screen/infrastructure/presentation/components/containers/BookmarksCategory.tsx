export interface BookmarkProps {
  text: string;
  handleClick: () => void;
  // iconName: string,
  // MaterialIcon: (props: {
  //     children: string;
  //     className?: string;
  // }) => preact.JSX.Element
}

export type BookmarkData = BookmarkProps & {
  key: string;
};

export interface Props {
  label: string;
  bookmarksData: BookmarkData[];
}

const BookmarkIcon = () => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={"none"}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18 7V21L12 17L6 21V7C6 5.93913 6.42143 4.92172 7.17157 4.17157C7.92172 3.42143 8.93913 3 10 3H14C15.0609 3 16.0783 3.42143 16.8284 4.17157C17.5786 4.92172 18 5.93913 18 7Z"
        stroke="black"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};

const Bookmark = ({
  text,
  handleClick,
  // iconName,
  // MaterialIcon
}: BookmarkProps) => {
  return (
    <button
      className={"bookmarks-section-bookmark clickable"}
      onClick={handleClick}
    >
      <BookmarkIcon />
      {text}
    </button>
  );
};

export const BookmarksCategory = ({ label, bookmarksData }: Props) => {
  return (
    <div>
      <h5 className={"bookmarks-section-label"}>{label}</h5>
      <div className={"bookmarks-section-container"}>
        {bookmarksData.map(({ key, ...rest }) => {
          return <Bookmark key={key} {...rest} />;
        })}
      </div>
    </div>
  );
};
