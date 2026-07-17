import { useI18n } from "seed-bible/i18n";
import { type TwitchSubInterface } from "./interface";
import type { SeedBibleState } from "seed-bible";
import { useRef, useEffect, useState } from "preact/hooks";

const TwitchSettings = (props: {
  twitchSubState: TwitchSubInterface;
  context: SeedBibleState;
}) => {
  const { t } = useI18n();
  const { settings, wsPaused } = props.twitchSubState;
  const isMobile = props.context.app.isMobile.value;

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          height: "100%",
          width: "100%",
        }}
      >
        <div
          className="twitchSub-content"
          style={{
            justifyContent: "flex-start",
            height: isMobile ? "calc(100% - 70px)" : "100%",
          }}
        >
          <div
            className="twitchSub-content"
            style={{ justifyContent: "flex-start" }}
          >
            <div className="twitchSub-settings-item">
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {t("followTranslationEvent", {
                  ns: "ext_twitchSub",
                  defaultValue: "Follow translation event",
                })}
                <InfoTooltip
                  text={t("followTranslationEventTooltip", {
                    ns: "ext_twitchSub",
                    defaultValue:
                      "Match the streamer's Bible translation when they switch it.",
                  })}
                />
              </span>
              <ToggleBtn
                toggle={settings.value.translationEnabled.value}
                setToggle={(value) =>
                  (settings.value.translationEnabled.value = value)
                }
                id={"translationToggle"}
                wsActive={wsPaused.value}
              />
            </div>
            <div className="twitchSub-settings-item">
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {t("followChapterEvent", {
                  ns: "ext_twitchSub",
                  defaultValue: "Follow chapter event",
                })}
                <InfoTooltip
                  text={t("followChapterEventTooltip", {
                    ns: "ext_twitchSub",
                    defaultValue:
                      "Follow along to the chapter the streamer opens.",
                  })}
                />
              </span>
              <ToggleBtn
                toggle={settings.value.chapterFollowEnabled.value}
                setToggle={(value) =>
                  (settings.value.chapterFollowEnabled.value = value)
                }
                id={"chapterFollowToggle"}
                wsActive={wsPaused.value}
              />
            </div>
            <div className="twitchSub-settings-item">
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {t("followHighlightEvent", {
                  ns: "ext_twitchSub",
                  defaultValue: "Follow highlight event",
                })}
                <InfoTooltip
                  text={t("followHighlightEventTooltip", {
                    ns: "ext_twitchSub",
                    defaultValue: "Show the verses the streamer highlights.",
                  })}
                />
              </span>
              <ToggleBtn
                toggle={settings.value.highlightEnabled.value}
                setToggle={(value) =>
                  (settings.value.highlightEnabled.value = value)
                }
                id={"highlightToggle"}
                wsActive={wsPaused.value}
              />
            </div>
            <div className="twitchSub-settings-item">
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {t("followRefEvent", {
                  ns: "ext_twitchSub",
                  defaultValue: "Follow reference event",
                })}
                <InfoTooltip
                  text={t("followRefEventTooltip", {
                    ns: "ext_twitchSub",
                    defaultValue:
                      "Jump to the verses the streamer references in the stream.",
                  })}
                />
              </span>
              <ToggleBtn
                toggle={settings.value.refFollowEnabled.value}
                setToggle={(value) =>
                  (settings.value.refFollowEnabled.value = value)
                }
                id={"refFollowToggle"}
                wsActive={wsPaused.value}
              />
            </div>
            <div
              style={{
                width: "100%",
                height: "1px",
                backgroundColor: "var(--text1)",
              }}
            ></div>
          </div>
          <div className="twitchSub-settings-item">
            <div></div>
            <button
              className={`session-btn ${wsPaused.value ? "rejoin-session-btn" : "leave-session-btn"}`}
              onClick={() => (wsPaused.value = !wsPaused.value)}
            >
              <span className="material-symbols-outlined">
                {wsPaused.value ? "link" : "link_off"}
              </span>
              {wsPaused.value
                ? t("rejoinSession", {
                    ns: "ext_twitchSub",
                    defaultValue: "Rejoin session",
                  })
                : t("leaveSession", {
                    ns: "ext_twitchSub",
                    defaultValue: "Leave session",
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
        className="material-symbols-outlined twitch-tooltip__icon icon-btn"
        aria-label={text}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{ fontSize: "18px" }}
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
  wsActive,
}: {
  toggle: boolean;
  setToggle: (value: boolean) => void;
  id: string;
  wsActive: boolean;
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
            disabled={wsActive}
          />
          <span
            className={`track-${id} track`}
            style={wsActive ? { background: "var(--sb-tertiary-color" } : {}}
          ></span>
          <span className={`thumb-${id} thumb`}></span>
        </label>
      </div>
    </>
  );
};
export default TwitchSettings;
