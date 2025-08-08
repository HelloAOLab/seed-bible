const toolBarOptions = {
    page: [],
    canvas: [],
    map: [
        {
            icon: 'Map', label: 'Bible Locations', hasToggle: true, active: true,
            onClick: async () => {
                if (globalThis.mapToolApp) {
                    RemoveApplicationByID(globalThis.MAP_PANEL_ID);
                    globalThis.MAP_PANEL_ID = null;
                    globalThis.mapToolApp = false;
                    return;
                }
                const App = await getBot('system', "introduction.searchBar").GeoJSONExperience()
                if (App) {
                    const id = uuid();
                    globalThis.mapToolApp = true;
                    globalThis.MAP_PANEL_ID = id;
                    AddApplication({ id, App: <App id={id} />, minWidth: '23rem' })
                }
            }
        }
    ]
}

return {
    toolBarOptions
}