import { type TwitchPubState } from "./interface";
import { useState, useRef, useEffect } from "preact/hooks";
import { useI18n } from "seed-bible/i18n";

const TwitchSettings = (props: { state: TwitchPubState }) => {
  const { settings, resetState, seedBibleState } = props.state;

  const { t } = useI18n();

  const [customTimerFlag, setCustomTimerFlag] = useState<string>("");
  const [customTimer, setCustomTimer] = useState<string | null>(null);

  // useEffect(() => {
  //   setTagMask(thisBot, "customTimerFlag", customTimerFlag, "local");
  //   setTagMask(thisBot, "customTimer", customTimer, "local");
  // }, [customTimerFlag, customTimer]);

  return (
    <>
      <div className="twitchPub-page">
        <div
          className="twitchPub-content"
          style={{
            height: seedBibleState.app.isMobile.value
              ? "calc(100% - 90px)"
              : "100%",
            justifyContent: "space-between",
          }}
        >
          <div className="twitchPub-content">
            <div className="twitchPub-settings-item">
              <span className="twitchPub-settings-label">
                {t("twitchSettings.broadcastTranslationEvents", {
                  ns: "ext_twitchPub",
                  defaultValue: "Broadcast translation events",
                })}
                <InfoTooltip
                  text={t("twitchSettings.broadcastTranslationEventsTooltip", {
                    ns: "ext_twitchPub",
                    defaultValue:
                      "Broadcasts the Bible translation you're reading so your viewers' readers switch to match whenever you change it.",
                  })}
                />
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
              <span className="twitchPub-settings-label">
                {t("twitchSettings.broadcastHighlightEvents", {
                  ns: "ext_twitchPub",
                  defaultValue: "Broadcast highlight events",
                })}
                <InfoTooltip
                  text={t("twitchSettings.broadcastHighlightEventsTooltip", {
                    ns: "ext_twitchPub",
                    defaultValue:
                      "Broadcasts the verses you highlight so your viewers see the same highlights in their reader.",
                  })}
                />
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
              <span className="twitchPub-settings-label">
                {t("twitchSettings.broadcastAiFollowEvents", {
                  ns: "ext_twitchPub",
                  defaultValue: "Broadcast verse reference events",
                })}
                <InfoTooltip
                  text={t("twitchSettings.broadcastAiFollowEventsTooltip", {
                    ns: "ext_twitchPub",
                    defaultValue:
                      "Detects the Bible verses you mention aloud during your stream and broadcasts them so your viewers' readers follow along automatically.",
                  })}
                />
              </span>
              <ToggleBtn
                toggle={settings.value.aiFollow.value.enabled}
                setToggle={(value) =>
                  (settings.value.aiFollow.value = {
                    ...settings.value.aiFollow.value,
                    enabled: value,
                  })
                }
                id={"aiFollowToggle"}
              />
            </div>
            <div className="twitchPub-settings-item">
              <span className="twitchPub-settings-label">
                {t("twitchSettings.announcementTimer", {
                  ns: "ext_twitchPub",
                  defaultValue: "Announcement Timer",
                })}
                <InfoTooltip
                  text={t("twitchSettings.announcementTimerTooltip", {
                    ns: "ext_twitchPub",
                    defaultValue:
                      "Automatically posts a chat announcement with your join link at the chosen interval so new viewers can follow along.",
                  })}
                />
              </span>
              <div className="twitchPub-timer-control">
                <select
                  value={
                    customTimerFlag === "custom"
                      ? "custom"
                      : settings.value.announcementTimer.value.interval?.toString() ||
                        "0"
                  }
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    e.stopPropagation();
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
                  <div className="twitch-custom-timer-wrapper">
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
                          if (
                            !isNaN(minutes) &&
                            value !== "" &&
                            value !== "."
                          ) {
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
                      className="twitch-custom-timer-suffix"
                      // eslint-disable-next-line seed-bible-i18n/i18n-untranslated-content
                    >
                      m
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="twitchPub-settings-item">
            <span className="twitchPub-settings-label"></span>
            <button onClick={resetState} className="twitchPub-logout-btn">
              {t("twitchSettings.logout", {
                ns: "ext_twitchPub",
                defaultValue: "Logout",
              })}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const InfoTooltip = ({ text }: { text: string }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Close when tapping/clicking anywhere outside the tooltip (needed on mobile,
  // where there is no hover to dismiss it).
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className={`twitch-tooltip ${open ? "twitch-tooltip--open" : ""}`}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="twitch-icon-btn material-symbols-outlined twitch-tooltip__icon"
        aria-label={text}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        // eslint-disable-next-line seed-bible-i18n/i18n-untranslated-content
      >
        info
      </button>
      <span className="twitch-tooltip__bubble" role="tooltip">
        {text}
      </span>
    </span>
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
