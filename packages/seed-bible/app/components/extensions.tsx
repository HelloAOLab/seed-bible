const { useEffect, useState, useMemo } = os.appHooks;
import { getStyleOf } from "app.styles.styler";
import {
  MenuIcon,
  T,
  MenuDown,
  FormatLine,
  ColorSelect,
  ToolbarIcon,
  Panal,
  Playlist,
} from "app.components.icons";
import { useTabsContext } from "app.hooks.tabs";
import { useSideBarContext } from "app.hooks.sideBar";

import { useBibleContext } from "app.hooks.bibleVariables";

const Packager = getBot("system", "app.packager");

const ToggleSwitch = ({ isOn, onToggle, disabled = false }) => {
  const switchStyle = {
    position: "relative",
    display: "inline-block",
    width: "44px",
    height: "24px",
    backgroundColor: isOn
      ? "var(--spaceSelection)"
      : disabled
        ? "#e0e0e0"
        : "#9e9e9e",
    borderRadius: "12px",
    cursor: disabled ? "default" : "pointer",
    transition: "background-color 0.2s ease",
    opacity: disabled ? 0.5 : 1,
  };

  const thumbStyle = {
    position: "absolute",
    top: "2px",
    left: isOn ? "22px" : "2px",
    width: "20px",
    height: "20px",
    backgroundColor: "white",
    borderRadius: "50%",
    transition: "left 0.2s ease",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  };

  return (
    <div style={switchStyle} onClick={disabled ? undefined : onToggle}>
      <div style={thumbStyle}></div>
    </div>
  );
};

function SettingsPanel({
  icon,
  name,
  address,
  installed,
  setUpdate,
  data,
  iconUrl,
}) {
  const { t } = useSideBarContext();
  const [buttonEnabled, setbuttonEnabled] = useState(true);
  const [showInToolbar, setShowInToolbar] = useState(false);
  const [showInPanel, setShowInPanel] = useState(false);
  const [showBelowPage, setShowBelowPage] = useState(false);
  const [expand, setExpand] = useState(false);
  // const [installed, setInstalled] = useState(false)
  const OPTIONS = {
    type: "normal",
    items: [
      {
        icon: <MenuIcon name={installed ? "extension_off" : "download"} />,
        title: installed ? t("uninstall") : t("install"),
        onClick: async () => {
          if (!installed) {
            await Packager.installPackage({ name: address });
          } else {
            Packager.uninstallPackage({ ...data, address });
            setExpand(false);
          }
          setUpdate((prev) => !prev);
          // setInstalled(true)
          // setExpand(true)
        },
      },
    ],
  };
  return (
    <>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div style={headerLeftStyle}>
            {iconUrl ? (
              <img
                src={iconUrl}
                style={{
                  width: "18px",
                  objectPosition: "center",
                  filter: "var(--filter-mode)",
                }}
              />
            ) : (
              <span className="material-symbols-outlined" style={iconStyle}>
                {icon}
              </span>
            )}
            <h3 style={titleStyle}>{name}</h3>
          </div>
          <div style={headerRightStyle}>
            {installed && (
              <ToggleSwitch
                isOn={buttonEnabled}
                onToggle={() => {
                  setbuttonEnabled(!buttonEnabled);
                  globalThis.ToggleToolActive(name, "stop");
                }}
              />
            )}
            <span
              onClick={() => (openPopupSettings as any)(OPTIONS)}
              className="material-symbols-outlined"
              style={iconStyle}
            >
              more_vert
            </span>
            {installed && (
              <span
                onClick={() => setExpand((prev) => !prev)}
                className="material-symbols-outlined"
                style={iconStyle}
              >
                {expand ? "expand_less" : "expand_more"}
              </span>
            )}{" "}
          </div>
        </div>

        {expand && (
          <div style={sectionStyle}>
            <div style={optionStyle}>
              <div style={optionLabelStyle}>
                <span className="material-symbols-outlined" style={iconStyle}>
                  close
                </span>
                <span>{t("showInToolbar")}</span>
              </div>
              <ToggleSwitch
                isOn={globalThis.IsToolActive && globalThis.IsToolActive(name)}
                onToggle={() => {
                  globalThis.ToggleToolActive(name);
                  setShowInToolbar(!showInToolbar);
                }}
                disabled={!buttonEnabled}
              />
            </div>

            <div style={subHeaderStyle}>{t("orShowIn")}</div>

            <div style={optionStyle}>
              <div style={optionLabelStyle}>
                <span className="material-symbols-outlined" style={iconStyle}>
                  view_sidebar
                </span>
                <span>{t("panel")}</span>
              </div>
              <ToggleSwitch
                isOn={
                  globalThis.IsToolSraterToolbar &&
                  globalThis.IsToolSraterToolbar(name)
                }
                onToggle={() => {
                  globalThis.ToToggleShowInStarterToolbar(name);
                  setShowInPanel(!showInPanel);
                }}
                disabled={!buttonEnabled}
              />
            </div>

            <div style={lastOptionStyle}>
              <div style={optionLabelStyle}>
                <span className="material-symbols-outlined" style={iconStyle}>
                  description
                </span>
                <span>{t("belowThePage")}</span>
              </div>
              <ToggleSwitch
                isOn={
                  globalThis.IsToolInPageToolbar &&
                  globalThis.IsToolInPageToolbar(name)
                }
                onToggle={() => {
                  globalThis.ToToggleShowInPageToolbar(name);
                  setShowBelowPage(!showBelowPage);
                }}
                disabled={!buttonEnabled}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const Extensions = () => {
  const { sidebarMode, setSideBarMode, t } = useSideBarContext();
  const [packages, setPackages] = useState();
  const [update, setUpdate] = useState();
  const { tools } = useBibleContext();
  async function getBackages() {
    const data = await Packager.getPackages();
    if (data) {
      setPackages(data);
      console.log(data, "getPackages");
    }

    // return data
  }
  useEffect(() => {
    getBackages();
  }, []);
  return (
    <div className="extensions-container">
      <div className="routerOptions">
        <div
          onClick={() => setSideBarMode("settings")}
          style={{ cursor: "pointer" }}
          className="blackText"
        >
          <MenuIcon name="arrow_back" />
        </div>
        <div className="softText">{t("configureExtensions")}</div>
        <div className="softText">
          <MenuIcon name="chevron_right" />
        </div>
        <div className="softText">{t("tools")}</div>
      </div>

      <div className="routerTitle blackText">
        <div className="blackText">
          {" "}
          <MenuIcon name="extension" />
        </div>
        <div>{t("configureExtensions")}</div>
      </div>

      <div className="mediumText">{t("extensionSettingsDesc")}</div>
      <div style={{ overflow: "scroll" }} className="extensions-tools">
        {packages &&
          [...packages].map((item: any) => {
            let data;
            let address;
            if ("data" in item && "address" in item) {
              data = item.data;
              address = item.address;
            } else {
              data = item;
              address = item.name;
            }

            // getBot('')
            return (
              <SettingsPanel
                data={data}
                address={address}
                setUpdate={setUpdate}
                installed={getBot("system", data?.mainBotTag)}
                icon={data?.configEditor?.toolbarConfig?.icon}
                iconUrl={data?.configEditor?.toolbarConfig?.iconUrl}
                name={data?.configEditor?.toolbarConfig?.label || address}
              />
            );
          })}
      </div>

      <style>{getStyleOf("extensions.css")}</style>
    </div>
  );
};

const containerStyle = {
  marginBottom: "8px",
  backgroundColor: "var(--pageBackground)",
  border: "1px solid var(--pageBackground)",
  borderRadius: "8px",
  // padding: '0',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: "14px",
  color: "var(--text1)",
  // width: '400px',
  // margin: '20px'
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px",
  // borderBottom: '1px solid #e1e4e8'
};

const headerLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const headerRightStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const titleStyle = {
  fontSize: "16px",
  fontWeight: "500",
  margin: "0",
};

const iconStyle = {
  fontSize: "20px",
  color: "#586069",
};

const sectionStyle = {
  padding: "20px",
};

const optionStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "20px",
};

const optionLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  fontSize: "14px",
  color: "#24292e",
};

const subHeaderStyle = {
  fontSize: "14px",
  color: "#586069",
  marginBottom: "16px",
  fontWeight: "400",
};

const lastOptionStyle = {
  ...optionStyle,
  marginBottom: "0",
};

export { Extensions };
