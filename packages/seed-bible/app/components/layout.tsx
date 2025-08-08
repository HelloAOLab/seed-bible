import useBibleData from 'app.hooks.bibleData'
import { getStyleOf } from 'app.styles.styler'
import { SideBar } from 'app.components.sideBar'
const { useEffect } = os.appHooks;
import { useMouseMove } from 'app.hooks.mouseMove'
import { Toolbar } from 'app.components.toolbar'
import SettingsSidebar from 'app.components.settings'
import { TextSettings, defaultTextConfig, exportTextConfigToCSS } from 'app.components.textSettings'
const SearchBar = getBot('system', "introduction.searchBar").SearchBar();
import { useSideBarContext } from 'app.hooks.sideBar'
import { useTabsContext } from 'app.hooks.tabs';
import { ToolbarSettings } from 'app.components.toolbarSettings'
import { AiSettings } from 'app.components.aiSettings'
import { useBibleContext } from 'app.hooks.bibleVariables'
shout('initialize')
const Layout = ({ children }) => {
  // using this to recored the mouse position always
  // u can use the position anywhere if needed (i will need it for tabs dragging)
  const { spaces, activeSpace } = useTabsContext()
  const { setPosition } = useMouseMove()
  const { sidebarMode, setSideBarMode, closePopupSettings } = useSideBarContext()
  const { canvasMode, setCanvasMode } = useBibleContext()
  useEffect(() => {
    const handleContextMenu = (e) => {
      // e.preventDefault();
      console.log('Global right-click blocked');
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);
  return (
    <div onMouseMove={() => {
      setPosition({ x: gridPortalBot.tags.pointerPixelX, y: gridPortalBot.tags.pointerPixelY })
    }}
      onContextMenu={(e) => {
        // e.preventDefault()
        os.log('works')
      }}
      onClick={() => {
        closePopupSettings()
      }}
      className="layout" style={canvasMode ? { background: 'transparent', pointerEvents: "none"} : {pointerEvents: "all"}}>
      <style>{`${spaces.find(e => e.id === activeSpace)?.settings?.text?.root || exportTextConfigToCSS(defaultTextConfig)}`}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
      {
        sidebarMode === 'default' ? <SideBar /> :
          sidebarMode === 'settings' ? <SettingsSidebar /> :
            sidebarMode === 'textSettings' ? <TextSettings /> :
              sidebarMode === 'toolbarSettings' ? <ToolbarSettings /> :
                sidebarMode === 'aiSettings' ? <AiSettings />
                  : null
      }
      <main className="content">
        {children}
      </main>
      <div>
        <Toolbar />
      </div>

      <style>{getStyleOf('main.css')}</style>
    </div>
  );
};

export default Layout;