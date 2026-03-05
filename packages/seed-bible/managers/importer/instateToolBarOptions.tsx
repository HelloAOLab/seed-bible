const instateToolBarOptions = ({ toolBarOptions }: any) => {
  if (
    globalThis?.SetTools &&
    globalThis?.SetCanvasTools &&
    globalThis?.SetMapTools
  ) {
    console.log("adding options");
    // setting page options
    toolBarOptions.page.forEach((tool: any) => {
      SetTools((tools: any) => {
        const exist = tools.filter((item: any) => item.icon === tool.icon);
        if (exist.length > 0) {
          return tools;
        } else {
          return [...tools, tool];
        }
      });
    });
    // setting canvas options
    toolBarOptions.canvas.forEach((tool: any) => {
      SetCanvasTools((tools: any) => {
        const exist = tools.filter((item) => item.icon === tool.icon);
        if (exist.length > 0) {
          return tools;
        } else {
          return [...tools, tool];
        }
      });
    });
    // setting map options
    toolBarOptions.map.forEach((tool: any) => {
      SetMapTools((tools: any) => {
        const exist = tools.filter((item) => item.icon === tool.icon);
        if (exist.length > 0) {
          return tools;
        } else {
          return [...tools, tool];
        }
      });
    });

    SetTools((tools) => tools.filter((tool: any) => tool.label !== "Loading"));
    SetCanvasTools((tools: any) =>
      tools.filter((tool: any) => tool.label !== "Loading")
    );
    SetMapTools((tools) => tools.filter((tool) => tool.label !== "Loading"));
  } else {
    // setTimeout(() => {
    //     console.log("trying to add again")
    //     instateToolBarOptions({toolBarOptions});
    // }, 1000)
  }
};

return instateToolBarOptions;
