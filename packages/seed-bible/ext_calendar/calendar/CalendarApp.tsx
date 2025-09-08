import {CalendarProvider} from "ext_calendar.calendar.CalendarContext";
const { createContext, useContext, useRef, useState, useEffect } = os.appHooks;
const App=await thisBot.Calendar();
const CalendarApp=()=>{
     const cachedApp = useRef(<App />);
    

    return (
        <CalendarProvider>
         {cachedApp.current}
        </CalendarProvider>

    )

}
return CalendarApp;