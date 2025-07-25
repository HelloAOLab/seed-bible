
const { useEffect, useState, useMemo } = os.appHooks;
import { getStyleOf } from 'app.styles.styler';
import { MenuIcon, T, MenuDown, FormatLine, ColorSelect, ToolbarIcon, Panal, Playlist } from 'app.components.icons'
import { useTabsContext } from 'app.hooks.tabs';
import { useSideBarContext } from 'app.hooks.sideBar'

import { useBibleContext } from 'app.hooks.bibleVariables'
const ToolbarSettings = () => {
  const { tools, canvasTools, mapTools, setTools, setCanvasTools, setMapTools } = useBibleContext();
  const { sidebarMode, setSideBarMode } = useSideBarContext();
  const { currentSpace } = useTabsContext()
  // const { tools, setTools } = useBibleContext();
  // const { updateToolsForSpace, getToolsForActiveSpace } = useTabsContext();
  // const tools = getToolsForActiveSpace();
  // const setTools = (newTools) => updateToolsForSpace(activeSpace, newTools);

  const currentMode = useMemo(() => {
    console.log(sidebarMode, "sidebarmode")
    if (sidebarMode && sidebarMode.split("-")[1]) {
      return sidebarMode.split("-")[1]
    } else {
      return "Page"
    }
  }, [sidebarMode])

  const [activeTools, setActiveTools] = useState([...tools])

  const toggleToolActive = (index, checked) => {
    os.log(checked)
    if (checked === undefined)
      checked = true
    if (currentMode === "Page") {
      setTools(
        tools.map((tool, i) =>
          i === index ? { ...tool, active: checked } : tool
        )
      );
    } else if (currentMode === "Canvas") {
      setCanvasTools(
        canvasTools.map((tool, i) =>
          i === index ? { ...tool, active: checked } : tool
        )
      );
    } else if (currentMode === "Map") {
      setMapTools(
        mapTools.map((tool, i) =>
          i === index ? { ...tool, active: checked } : tool
        )
      );
    }
  };

  useEffect(() => {
    if (currentMode === "Page") {
      setActiveTools(tools);
    } else if (currentMode === "Canvas") {
      setActiveTools(canvasTools);

    } else if (currentMode === "Map") {
      setActiveTools(mapTools);
    }
  }, [sidebarMode, tools, canvasTools, mapTools, currentMode])

  return (
    <div className="toolbar-container boundElements">
      <div className="routerOptions">
        <div onClick={() => setSideBarMode('settings')} style={{ cursor: 'pointer' }}  className="blackText">
          <MenuIcon name="arrow_back" />
        </div>
        <div className="softText">{currentMode} settings</div>
        <div className="softText"><MenuIcon name="chevron_right" /></div>
        <div className="softText">Toolbar</div>
      </div>

      <div className="routerTitle blackText">
        <div className="blackText"><ToolbarIcon /></div>
        <div>Toolbar</div>
      </div>

      <div className="mediumText">Settings for your toolbar in the {currentMode.toLowerCase() === 'page' ? currentSpace.name : currentMode.toLowerCase()}</div>

      <div className="all-tools-header">
        <span>All Tools</span>
        <button className="add-btn">＋</button>
      </div>

      <ul className="tool-list">
        {activeTools.map((tool, index) => {
          // os.log(tool)
          return (
            <li
              key={index}
              className={`tool-item ${tool.active ? 'active' : ''}`}
              onClick={() => toggleToolActive(index, !tool.active)}
            >
              <span className="icon">
                {typeof tool.icon === 'string' && !tool.isImg ? <MenuIcon name={tool.icon} /> : tool.isImg ? <img src={tool.icon} style={{ width: '20px' }} /> : tool.icon}
              </span>
              <span className="label">{tool.label}</span>
              {tool.hasToggle && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={{
                      backgroundColor: tool.active ? '#4CAF50' : '#f1f1f1',
                      color: tool.active ? '#fff' : '#000',
                      padding: '5px 10px',
                      borderRadius: '5px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleToolActive(index, true);
                    }}
                  >
                    On
                  </button>
                  <button
                    style={{
                      backgroundColor: !tool.active ? '#f44336' : '#f1f1f1',
                      color: !tool.active ? '#fff' : '#000',
                      padding: '5px 10px',
                      borderRadius: '5px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleToolActive(index, false);
                    }}
                  >
                    Off
                  </button>
                </div>
              )}
              {tool.hasToggle && <div className="menu-dots">⋮</div>}
            </li>

          )
        })}
      </ul>

      <style>{getStyleOf('toolbarSettings.css')}</style>
    </div>
  );
};



export { ToolbarSettings }