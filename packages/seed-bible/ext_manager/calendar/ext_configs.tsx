let toolBarOptions = {
    page: [
        {
            icon: 'calendar_month', label: 'Calendar', hasToggle: true, active: true,
            onClick: async () => {
                if (globalThis.calendarToolApp) {
                    RemoveApplicationByID(globalThis.CALENDAR_PANEL_ID);
                    globalThis.CALENDAR_PANEL_ID = null;
                    globalThis.calendarToolApp = false;
                    return;
                }
                let App = await getBot('system', "ext_calendar.calendar").CalendarApp();
                if (App) {
                    let id = uuid();
                    globalThis.calendarToolApp = true;
                    globalThis.CALENDAR_PANEL_ID = id;
                    AddApplication({ id, App: <App id={id} />, minWidth: '23rem' })
                }
            }
        }
    ],
    canvas: [],
    map: []
}

return {
    toolBarOptions
}