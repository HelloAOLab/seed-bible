import { usePresenceCard } from "../../hooks/usePresenceCard";
import type { UserIconProps } from "../ui/UserIcon";
import { UserIcon } from "../ui/UserIcon";

export type UserIconData = UserIconProps & {
  key: string;
};

export const PresenceCard = () => {
  const {
    liveText,
    reading,
    userIconsData,
    joinText,
    handleJoinClick,
    showCard,
  } = usePresenceCard();

  if (!showCard.value) return;

  return (
    <div className={"presence-card today-section-card"}>
      <div className={"presence-card-left-section"}>
        <div className={"presence-card-status"}>
          <div></div>
          {liveText}
        </div>
        <div className={"presence-card-left-section-dot"}></div>
        <span className={"presence-card-reading"}>{reading.value}</span>
      </div>
      <div className={"presence-card-right-section"}>
        <div className={"presence-card-avatar-group"}>
          {userIconsData.value.map(({ key, ...rest }) => (
            <UserIcon key={key} {...rest} />
          ))}
        </div>
        <button
          onClick={handleJoinClick}
          className={"presence-card-join-button"}
        >
          {joinText}
        </button>
      </div>
    </div>
  );
};
