import {CalendarProvider} from "ext_calendar.calendar.CalendarContext";
const App=await thisBot.Calendar();
const CalendarApp=()=>{
    

    return (
        <CalendarProvider>
        <App/>
        </CalendarProvider>

    )

}
return CalendarApp;