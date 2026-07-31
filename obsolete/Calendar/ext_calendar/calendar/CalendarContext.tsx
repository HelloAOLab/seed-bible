const { createContext, useContext, useState, useRef } = os.appHooks;
const MyContext = createContext();
export function CalendarProvider({ children }) {
  const [apiCalendar, setApiCalendar] = useState({});
  const refCalendar = useRef();

  return (
    <MyContext.Provider value={{ apiCalendar, setApiCalendar, refCalendar }}>
      {children}
    </MyContext.Provider>
  );
}
export function useCalendar() {
  return useContext(MyContext);
}
