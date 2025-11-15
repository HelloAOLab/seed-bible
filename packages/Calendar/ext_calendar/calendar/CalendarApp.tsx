import {CalendarProvider} from "ext_calendar.calendar.CalendarContext";
const { createContext, useContext, useRef, useState, useEffect } = os.appHooks;
const App=await thisBot.Calendar();
const CalendarApp=()=>{
     
     const cachedApp = useRef(<App />);
       useEffect(() => {
     // Load styles
 
 
     // Load scripts sequentially
     const scripts = [
      
       
       "https://cdn.jsdelivr.net/npm/fullcalendar-scheduler@6.1.18/index.global.min.js"
 
     ];
 
     function loadScriptsSequentially(index = 0, callback) {
       if (index >= scripts.length) return callback();
 
       const script = document.createElement("script");
       script.src = scripts[index];
       script.onload = () => loadScriptsSequentially(index + 1, callback);
       script.onerror = () => console.error("Failed to load", scripts[index]);
       document.body.appendChild(script);
     }
 
     loadScriptsSequentially(0, () => {
       console.log("FullCalendar scripts loaded");
     });
   }, []);
    

    return (
        <CalendarProvider>
         {cachedApp.current}
        </CalendarProvider>

    )

}
return CalendarApp;