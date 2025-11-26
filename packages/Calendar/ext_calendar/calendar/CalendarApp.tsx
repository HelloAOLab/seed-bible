import { CalendarProvider } from "ext_calendar.calendar.CalendarContext";
const { createContext, useContext, useRef, useState, useEffect, useMemo } =
  os.appHooks;

const App = await thisBot.Calendar();

const CalendarApp = () => {
  const cachedApp = useMemo(() => <App />, []);
  return <CalendarProvider>{cachedApp}</CalendarProvider>;
};

return CalendarApp;
