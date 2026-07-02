import { showPersonVideoOverlayCss } from "ext_discover.css.showPersonVideoOverlayCss";
import { getShowPersonVideoOverlayManager } from "ext_discover.managers.ShowPersonVideoOverlayManager";
import type { ShowPersonVideoOverlayProps } from "ext_discover.interfaces.components.ShowPersonVideoOverlay";

export function ShowPersonVideoOverlay({
  manager = getShowPersonVideoOverlayManager(),
}: ShowPersonVideoOverlayProps) {
  if (!manager.visible.value) return null;

  const overlaySize = manager.overlaySize.value;
  const position = manager.position.value;

  return (
    <>
      <style>{showPersonVideoOverlayCss}</style>
      <div
        onMouseDown={manager.handleMouseDown}
        style={{
          top: `${position.y}${`${position.y}`.endsWith("h") ? "" : "px"}`,
          left: `${position.x}${`${position.x}`.endsWith("w") ? "" : "px"}`,
          transition: "0.01s linear all",
        }}
        className={`person-video-overlay ${overlaySize}`}
      >
        <video
          poster={`https://dummyimage.com/240x240/000/fff&text=Preview`}
          className={`size-${overlaySize}`}
          muted={true}
          controls={false}
          ref={manager.attachVideoElement}
          playsInline
          autoPlay
        />
        <div className="control-overlay">
          <span
            class="material-symbols-outlined"
            onClick={manager.handleCloseAndToggleLayout}
          >
            close
          </span>
          {manager.sizeOptions.map((ele) => (
            <div
              key={ele.value}
              className={`person-video-size ${
                overlaySize === ele.value ? "active" : ""
              }`}
              onClick={() => manager.setOverlaySize(ele.value)}
              style={{
                height: ele.size,
                width: ele.size,
                backgroundColor: "black",
              }}
            />
          ))}
          <span
            class="material-symbols-outlined"
            onClick={manager.toggleFullscreen}
          >
            {overlaySize === "full" ? "fullscreen_exit" : "fullscreen"}
          </span>
        </div>
      </div>
    </>
  );
}
