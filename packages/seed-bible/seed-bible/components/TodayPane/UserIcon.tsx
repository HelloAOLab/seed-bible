import { MaterialIcon } from "../icons";

export type UserIconProps = {
  pictureUrl?: string;
  color: string;
  icon: string;
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
      <MaterialIcon>{props.icon}</MaterialIcon>
    </div>
  );
};
