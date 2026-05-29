import { useHeader } from "../../hooks/useHeader";

export const Header = () => {
  const { date, greeting, name, MaterialIcon } = useHeader();

  return (
    <div className="today-header">
      <span>{date}</span>
      <h1>
        {greeting}, <span>{name}!</span>
      </h1>
      <button>
        <MaterialIcon>notifications</MaterialIcon>
      </button>
    </div>
  );
};
