import { useTodayContainer } from "../../hooks/useTodayContainer";

export const TodayContainer = () => {
  const { Component } = useTodayContainer();

  return (
    <div className="today-container">
      <Component />
    </div>
  );
};
