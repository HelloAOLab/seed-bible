export type UserIconProps = {
  pictureUrl?: string;
  color: string;
  icon: string;
  MaterialIcon: (props: {
    children: string;
    className?: string | undefined;
  }) => preact.JSX.Element;
};

export const UserIcon = (props: UserIconProps) => {
  if (props.pictureUrl) {
    return (
      <img src={props.pictureUrl} className="filtered-reading-book-icon" />
    );
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
