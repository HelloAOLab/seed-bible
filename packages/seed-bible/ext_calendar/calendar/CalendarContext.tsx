const { createContext, useContext, useState,useRef } = os.appHooks;
const MyContext = createContext();
export function CalendarProvider({children}){
    const [apiCalendar,setApiCalendar]=useState({});
    const [name,setName]=useState('Amit');
    return(
        <MyContext.Provider value={{name,apiCalendar,setApiCalendar}}>
        {children}

        </MyContext.Provider>
    )
}
export function useCalendar() {
    return useContext(MyContext);
}
