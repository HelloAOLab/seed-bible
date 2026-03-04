const G = globalThis;
const TogglePlaylistHeight = () => {
  const isMobile = (window?.innerWidth || gridPortalBot.tags.pixelWidth) < 766;
  return isMobile ? (
    <div
      className="publish-setting"
      style={{ marginRight: "0.5rem" }}
      onClick={(e) => {
        const isMobile =
          (window?.innerWidth || gridPortalBot.tags.pixelWidth) < 766;
        if (!isMobile)
          return ShowNotification({
            message: `Unable to toggle playlist height in desktop view.`,
            severity: "error",
          });
        G.SetPlaylistForcedHeight((p: any) => (p === 0 ? 1 : p === 1 ? 2 : 0));
      }}
    >
      <span class="material-symbols-outlined" style={{ color: "#D36433" }}>
        unfold_more_double
      </span>
    </div>
  ) : null;
};

return TogglePlaylistHeight;
