import { screenRecordingCss } from "ext_discover.css.screenRecordingCss";
import type { ScreenRecordingStopButtonProps } from "ext_discover.interfaces.components.ScreenRecordingStopButton";
import { Button } from "ext_discover.features.components.Button";

export function ScreenRecordingStopButton({
  manager,
}: ScreenRecordingStopButtonProps) {
  if (manager.hidden.value) {
    return null;
  }

  const painterApp = getBot("system", "aiApps.painter");
  const pos = manager.position.value;
  const video = manager.video.value;

  return (
    <>
      <style>{screenRecordingCss}</style>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />
      <div
        className="ScreenRecording"
        onMouseUp={manager.handleMouseUp}
        onMouseDown={manager.handleMouseDown}
        style={{
          top: `${pos.y}${`${pos.y}`.endsWith("h") ? "" : "px"}`,
          left: `${pos.x}${`${pos.x}`.endsWith("w") ? "" : "px"}`,
        }}
      >
        <span style={{ cursor: "grab" }} class="material-symbols-outlined">
          drag_indicator
        </span>
        {painterApp && (
          <span
            style={{ cursor: "pointer" }}
            onClick={() => {
              painterApp.togglePainter();
            }}
            class="material-symbols-outlined"
          >
            brush
          </span>
        )}
        <p>{t("youAreSharingYourScreen")}</p>
        <div
          src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/8c36b2ef970a1ddd51de47ff2157fc2d7746fcfbb2f02f8941018052d29dbb31.svg"
          className="pointer stop-recording align-center"
          onClick={manager.handleStop}
        >
          <span class="material-symbols-outlined">cancel</span>
          <span>{t("stopRecording")}</span>
        </div>
        {!video && (
          <Button onClick={manager.toggleVideo} secondary>
            {video ? t("turnOff") : t("turnOn")} {t("video")}
          </Button>
        )}
        <p className="hide" onClick={manager.hide}>
          {t("hide")}
        </p>
      </div>
    </>
  );
}
