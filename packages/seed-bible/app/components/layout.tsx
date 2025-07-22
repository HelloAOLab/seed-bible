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
import { SpaceUI } from 'app.components.sideBar'
import { ThemeSettings } from 'app.components.themeSettings'
import { AiSettings } from 'app.components.aiSettings'
import { CanvasAiSettings } from 'app.components.canvasAiSettings'
import { PromtBarSettings } from 'app.components.PromtBarSettings'
import { CreateAccountSettings } from 'app.components.createAccountSettings'
import { useBibleContext } from 'app.hooks.bibleVariables'
shout('initialize')
globalThis.PanelTabsMap = {}; // { panelId: tabObject }

const Layout = ({ children }) => {
  // using this to recored the mouse position always
  // u can use the position anywhere if needed (i will need it for tabs dragging)
  const { spaces, activeSpace } = useTabsContext()
  const { setPosition } = useMouseMove()
  const { sidebarMode, setSideBarMode, closePopupSettings, themeColors } = useSideBarContext()
  const { canvasMode, setCanvasMode } = useBibleContext()
  useEffect(() => {
    const handleContextMenu = (e) => {
      // e.preventDefault();
      // console.log('Global right-click blocked');
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);
  return (
    <div onMouseMove={(e) => {
      setPosition({ x: e.clientX, y: e.clientY })
    }}
      onContextMenu={(e) => {
        // e.preventDefault()
        // os.log('works')
      }}
      onClick={() => {
        closePopupSettings()
      }}
      className="layout" style={{ background: 'white' }}>
     
      <style>{`${spaces.find(e => e.id === activeSpace)?.settings?.text?.root || exportTextConfigToCSS(defaultTextConfig)}`}</style>
      {
        sidebarMode === 'default' ? <SideBar /> :
          sidebarMode === 'settings' ? <SettingsSidebar /> :
            sidebarMode === 'textSettings' ? <TextSettings /> :
              sidebarMode.includes('toolbarSettings') ? <ToolbarSettings /> :
                sidebarMode === 'promtSettings' ? <PromtBarSettings /> :
                  sidebarMode === 'canvasAiSettings' ? <CanvasAiSettings /> :
                    sidebarMode === 'themeSettings' ? <ThemeSettings /> :
                      sidebarMode === 'aiSettings' ? <AiSettings /> :
                        sidebarMode === 'createAccountSettings' ? <CreateAccountSettings />
                          : null
      }
      {(sidebarMode === 'default' || sidebarMode === 'settings' || sidebarMode === 'themeSettings') && <SpaceUI />}

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