import { useBibleLayout2DContext } from "bibleLayout2D.main.BibleLayout2DContext";

export const PresentUserPresenceBookIcon = ({ user, index, length }) => {
  const { usersInfo } = useBibleLayout2DContext();

  return (
    <div
      className="presentUserPresenceIcon presentUserPresenceIcon-book"
      style={{
        backgroundColor: usersInfo[user].color,
        right: `calc((var(--FIXED_SIZE_8) / 2 * (-1)) + (var(--FIXED_SIZE_8) / 2 * ${length - index - 1}))`,
        zIndex: length - index,
      }}
    >
      <span>{user[0]}</span>
    </div>
  );
};

export const PresentUserPresenceTooltipIcon = ({ user }) => {
  const { usersInfo } = useBibleLayout2DContext();

  return (
    <div
      className="presentUserPresenceIcon presentUserPresenceIcon-tooltip"
      style={{
        backgroundColor: usersInfo[user].color,
      }}
    >
      <span>{user[0]}</span>
    </div>
  );
};
