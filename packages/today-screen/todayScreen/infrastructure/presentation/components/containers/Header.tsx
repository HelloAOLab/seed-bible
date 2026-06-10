import { useHeader } from "../../hooks/useHeader";

export const Header = () => {
  const {
    date,
    greeting,
    name,
    MaterialIcon,
    notificationIcon,
    settingsIcon,
    handleNotificationClick,
    handleSettingsClick,
  } = useHeader();

  return (
    <div className="today-header">
      <span>{date}</span>
      <h1>
        {greeting}, <span>{name}!</span>
      </h1>
      <button onClick={handleNotificationClick}>
        <MaterialIcon>{notificationIcon}</MaterialIcon>
      </button>
      <button onClick={handleSettingsClick}>
        <MaterialIcon>{settingsIcon}</MaterialIcon>
      </button>
    </div>
  );
};
