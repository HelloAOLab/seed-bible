import { isMobilePlaylistViewport } from "ext_discover.hooks.isMobilePlaylistViewport";
import type { TogglePlaylistHeightProps } from "ext_discover.interfaces.components.TogglePlaylistHeight";

const G = globalThis as Record<string, any>;

export function TogglePlaylistHeight(_props: TogglePlaylistHeightProps) {
  if (!isMobilePlaylistViewport()) return null;

  return (
    <div
      className="publish-setting"
      style={{ marginRight: "0.5rem" }}
      onClick={() => {
        if (!isMobilePlaylistViewport()) {
          return ShowNotification({
            message: `Unable to toggle playlist height in desktop view.`,
            severity: "error",
          });
        }
        G.SetPlaylistForcedHeight((p: number) =>
          p === 0 ? 1 : p === 1 ? 2 : 0
        );
      }}
    >
      <span class="material-symbols-outlined" style={{ color: "#D36433" }}>
        unfold_more_double
      </span>
    </div>
  );
}
