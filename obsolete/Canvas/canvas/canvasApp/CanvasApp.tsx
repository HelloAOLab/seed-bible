const { useEffect, useState, useRef } = os.appHooks;

function App({ tab: T, panelId, activeTab }) {
  const [tab, setTab] = useState(T);

  useEffect(() => {
    if (!T) globalThis.CurrentPanelAvailable = panelId;
    else globalThis.CurrentPanelAvailable = null;
  }, [T]);

  function Update(tab) {
    os.log("Update-data", tab);
    setTab(tab);
    if (tab && tab?.id) SetActiveTab(tab?.id);
    globalThis.CurrentActivePanel = panelId;
  }

  useEffect(() => {
    globalThis[`UpdateTabWidthId${tab?.id}`] = Update;
    return () => {
      globalThis[`UpdateTabWidthId${tab?.id}`] = null;
    };
  }, [tab]);

  useEffect(() => {
    console.log(tab, "canvas tab data");
    if (!tab) return;
    console.log(tab, "canvas tab loaded");
    if (tab && tab.data.type === "canvas") {
      configBot.tags.mapPortal = null;
      configBot.tags.miniMapPortal = null;
      configBot.tags.gridPortal = `${tab?.data?.book}-${tab?.data?.chapter}`;
      setTagMask(thisBot, "canvasTab", tab, "tempLocal");
      setTagMask(
        thisBot,
        "onGridClick",
        `@
                console.log(masks.canvasTab)
                if (globalThis[\`UpdateTabWidthId\${masks.canvasTab?.id}\`]){
                    console.log("updating tab via grid");
                    globalThis[\`UpdateTabWidthId\${masks.canvasTab?.id}\`](masks.canvasTab)
                }
            `,
        "tempLocal"
      );
      globalThis.activeCanvasId = tab?.id;
    }
    return () => {
      masks.canvasTab = null;
      masks.onGridClick = null;
      globalThis.activeCanvasId = null;
      masks.lastLocation = null;
      configBot.tags.gridPortal = null;
    };
  }, [tab]);

  const divRef = useRef(null);

  useEffect(() => {
    if (tab && tab.id === activeTab && panelId) {
      console.log("CurrentActivePanel", panelId);
      globalThis.CurrentActivePanel = panelId;
      return () => {
        globalThis.CurrentActivePanel = null;
      };
    }
  }, [activeTab, panelId, tab]);

  if (
    tab?.data?.type === "canvas" &&
    (globalThis?.activeCanvasId ? tab?.id === globalThis.activeCanvasId : true)
  ) {
    return (
      <div style={{ width: "100%", height: "100%" }}>
        {" "}
        <div
          ref={divRef}
          id="#mainCanvas"
          class="mainCanvas"
          style={{
            width: "100%",
            height: "100%",
            border: "1px solid black",
            overflow: "auto",
          }}
        ></div>
      </div>
    );
  } else {
    return <></>;
  }
}

return App;
