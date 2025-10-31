const toolBarOptions = {
    page: [
    ],
    canvas: [
        {
            icon: 'database', label: 'Data Ocean', hasToggle: true, active: true,
            onClick: async () => {
                if (globalThis.eventToolApp) {
                    RemoveApplicationByID(globalThis.EVENT_PANEL_ID);
                    globalThis.EVENT_PANEL_ID = null;
                    globalThis.eventToolApp = false;
                    return;
                }
                const App = await getBot('system', "ext_canvas.eventTool").initInterface()
                if (App) {
                    const id = uuid();
                    globalThis.eventToolApp = true;
                    globalThis.EVENT_PANEL_ID = id;
                    AddApplication({ id, App: <App id={id} />, minWidth: '23rem' })
                }
            }
        },
        {
            icon: 'title', label: 'Text Tool', hasToggle: true, active: true,
            onClick: async () => {
                sendIcon({ type: 'text_tool', trayColor: "#ffffff", dragerColor: "#000000", action: null });
            }
        },
        {
            icon: 'ink_eraser_off', label: 'Eraser', hasToggle: true, active: true,
            onClick: async () => {
                sendIcon({ type: 'eraser', trayColor: "#ffffff", dragerColor: "#000000", action: null });
            }
        },
    ],
    map: []
}

return {
    toolBarOptions
}