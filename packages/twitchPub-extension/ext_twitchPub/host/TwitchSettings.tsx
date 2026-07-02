import { TwitchIcon } from "./icons";
import { type TwitchPubState } from "./interface";
import { useState } from "preact/hooks";
import { useI18n } from "seed-bible/i18n";

const TwitchSettings = (props: { state: TwitchPubState }) => {
  const { setCurrentPage, settings } = props.state;

  const { t } = useI18n();

  const [customTimerFlag, setCustomTimerFlag] = useState<string>("");
  const [customTimer, setCustomTimer] = useState<string | null>(null);

  // useEffect(() => {
  //   setTagMask(thisBot, "customTimerFlag", customTimerFlag, "local");
  //   setTagMask(thisBot, "customTimer", customTimer, "local");
  // }, [customTimerFlag, customTimer]);

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "fit-content",
          width: "100%",
        }}
      >
        <div className="twitchPub-header">
          <span
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <TwitchIcon style={{ width: "24px", height: "24px" }} />
            {t("twitchSettings.title", {
              ns: "ext_twitchPub",
              defaultValue: "Twitch Settings",
            })}
          </span>
          <button
            className="icon-btn material-symbols-outlined"
            onClick={() => setCurrentPage("interface")}
            // eslint-disable-next-line seed-bible-i18n/i18n-untranslated-content
          >
            arrow_back
          </button>
        </div>
        <div className="twitchPub-content">
          <div className="twitchPub-settings-item">
            <span>
              {t("twitchSettings.broadcastTranslationEvents", {
                ns: "ext_twitchPub",
                defaultValue: "Broadcast translation events",
              })}
            </span>
            <ToggleBtn
              toggle={settings.value.translation.value.enabled}
              setToggle={(value) =>
                (settings.value.translation.value = {
                  ...settings.value.translation.value,
                  enabled: value,
                })
              }
              id={"translationToggle"}
            />
          </div>
          <div className="twitchPub-settings-item">
            <span>
              {t("twitchSettings.broadcastHighlightEvents", {
                ns: "ext_twitchPub",
                defaultValue: "Broadcast highlight events",
              })}
            </span>
            <ToggleBtn
              toggle={settings.value.highlight.value.enabled}
              setToggle={(value) =>
                (settings.value.highlight.value = {
                  ...settings.value.highlight.value,
                  enabled: value,
                })
              }
              id={"highlightToggle"}
            />
          </div>
          <div className="twitchPub-settings-item">
            <span>
              {t("twitchSettings.announcementTimer", {
                ns: "ext_twitchPub",
                defaultValue: "Announcement Timer",
              })}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <select
                value={
                  customTimerFlag === "custom"
                    ? "custom"
                    : settings.value.announcementTimer.value.interval?.toString() ||
                      "0"
                }
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  e.stopPropagation();
                  console.log(
                    "Selected announcement timer:",
                    e.currentTarget.value
                  );
                  if (e.currentTarget.value === "custom") {
                    settings.value.announcementTimer.value = {
                      ...settings.value.announcementTimer.value,
                      interval: null,
                    };
                    setCustomTimerFlag("custom");
                  } else {
                    settings.value.announcementTimer.value = {
                      ...settings.value.announcementTimer.value,
                      interval: Number(e.currentTarget.value),
                    };
                    setCustomTimerFlag("");
                  }
                }}
                onMouseDown={(e: MouseEvent) => e.stopPropagation()}
                onTouchStart={(e: TouchEvent) => e.stopPropagation()}
                className="twitch-select-box"
              >
                <option value={0}>
                  {t("twitchSettings.off", {
                    ns: "ext_twitchPub",
                    defaultValue: "Off",
                  })}
                </option>
                <option value={300000}>
                  {t("twitchSettings.fiveMinutes", {
                    ns: "ext_twitchPub",
                    defaultValue: "5m",
                  })}
                </option>
                <option value={600000}>
                  {t("twitchSettings.tenMinutes", {
                    ns: "ext_twitchPub",
                    defaultValue: "10m",
                  })}
                </option>
                <option value={900000}>
                  {t("twitchSettings.fifteenMinutes", {
                    ns: "ext_twitchPub",
                    defaultValue: "15m",
                  })}
                </option>
                <option value={1200000}>
                  {t("twitchSettings.twentyMinutes", {
                    ns: "ext_twitchPub",
                    defaultValue: "20m",
                  })}
                </option>
                <option value="custom">
                  {t("twitchSettings.custom", {
                    ns: "ext_twitchPub",
                    defaultValue: "Custom",
                  })}
                </option>
              </select>
              {customTimerFlag === "custom" && (
                <div
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={customTimer !== null ? customTimer : ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.currentTarget.value;

                      // Allow empty, digits, and decimal point
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setCustomTimer(value);
                        const minutes = parseFloat(value);
                        if (!isNaN(minutes) && value !== "" && value !== ".") {
                          settings.value.announcementTimer.value = {
                            ...settings.value.announcementTimer.value,
                            interval: minutes * 60000,
                          };
                        } else if (value === "") {
                          settings.value.announcementTimer.value = {
                            ...settings.value.announcementTimer.value,
                            interval: 0,
                          };
                        }
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="twitch-custom-timer-input"
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 10,
                      fontSize: 14,
                      color: "#888",
                      pointerEvents: "none",
                    }}
                    // eslint-disable-next-line seed-bible-i18n/i18n-untranslated-content
                  >
                    m
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const ToggleBtn = ({
  toggle,
  setToggle,
  id,
}: {
  toggle: boolean;
  setToggle: (value: boolean) => void;
  id: string;
}) => {
  return (
    <>
      <style>
        {toggle
          ? `
            .track-${id} {
                background: var(--sb-primary-color);
            }
            .thumb-${id} {
                transform: translateX(23px);
            }
        `
          : ``}
      </style>
      <div
        className="toggle-wrapper"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <label className="toggle">
          <input
            type="checkbox"
            checked={toggle}
            id={id}
            onChange={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setToggle(!toggle);
            }}
          />
          <span className={`track-${id} track`}></span>
          <span className={`thumb-${id} thumb`}></span>
        </label>
      </div>
    </>
  );
};
export default TwitchSettings;
