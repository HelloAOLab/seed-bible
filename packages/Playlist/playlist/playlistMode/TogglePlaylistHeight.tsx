const TogglePlaylistHeight = () => {
  const isMobile =
    (window?.innerWidth || gridPortalBot.tags.pixelWidth) <
    MOBILE_VIEWPORT_THRESHOLD;

  return isMobile ? (
    <div
      className="publish-setting"
      style={{ marginRight: "0.5rem" }}
      onClick={(e) => {
        globalThis.SetPlaylistForcedHeight((p) => !p);
      }}
    >
      <span class="material-symbols-outlined" style={{ color: "#D36433" }}>
        unfold_more_double
      </span>
    </div>
  ) : null;
};

return TogglePlaylistHeight;
