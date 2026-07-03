import { useTodayContainer } from "../../hooks/useTodayContainer";

export const TodayContainer = () => {
  const { Component, style } = useTodayContainer();

  return (
    <div className="today-container" style={style}>
      <Component />
    </div>
  );
};
