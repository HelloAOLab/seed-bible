const G = globalThis as any;
const { useMemo } = os.appHooks;

const PlaylistTopBar = (props: any) => {
  const [PlaylistIconT, AnnotationIconT, ReadingPlanIconT] = useMemo(() => {
    return [G.PlaylistIcon, G.AnnotationIcon, G.ReadingPlanIcon];
  }, []);

  const {
    setCreateOptions,
    showPlaylistPosition,
    isMobile,
    SplitAppPanel2,
    gotoCreate,
  } = props;
  return (
    <>
      <div className="backdrop" onClick={() => setCreateOptions(false)} />
      <div
        onClick={() => setCreateOptions(false)}
        style={{
          ...showPlaylistPosition.current,
          width: isMobile ? "165px" : "210px",
          maxHeight: "157px",
          left: "none",
          right: isMobile ? "-9rem" : "-12rem",
          padding: "0.5rem",
          top: !isMobile ? "3rem" : "none",
          bottom: !isMobile ? "none" : "11rem",
          marginTop: 45,
        }}
        className="overlay linked-item-custom"
      >
        <div
          className="more-menu-items"
          onClick={(e) => {
            e.stopPropagation();
            if (SplitAppPanel2) {
              G.PendingAction = gotoCreate;
              G.StopPlayingPlaylistModal(true);
              return;
            }
            gotoCreate("playlist");
          }}
        >
          <div className="align-center" style={{ gap: "0.5rem" }}>
            <PlaylistIconT />
            <span style={{ fontFamily: `"Satoshi", system-ui, sans-serif` }}>
              {t("playlist")}
            </span>
          </div>
        </div>
        <div
          className="more-menu-items"
          onClick={(e) => {
            // if not login show notification
            if (!authBot?.id) {
              ShowNotification({
                message: t("pleaseLoginToUseFeature"),
                severity: "error",
              });
              shout("tryUserLogin");
              return;
            }
            e.stopPropagation();
            if (SplitAppPanel2) {
              G.PendingAction = () => gotoCreate(true);
              G.StopPlayingPlaylistModal(true);
              return;
            }
            gotoCreate("annotation");
          }}
        >
          <div className="align-center" style={{ gap: "0.5rem" }}>
            <AnnotationIconT />
            <span style={{ fontFamily: `"Satoshi", system-ui, sans-serif` }}>
              {t("annotation")}
            </span>
          </div>
        </div>
        <div
          className="more-menu-items"
          onClick={(e) => {
            // if not login show notification
            if (!authBot?.id) {
              ShowNotification({
                message: t("pleaseLoginToUseFeature"),
                severity: "error",
              });
              shout("tryUserLogin");
              return;
            }
            e.stopPropagation();
            if (SplitAppPanel2) {
              G.PendingAction = () => gotoCreate(true);
              G.StopPlayingPlaylistModal(true);
              return;
            }
            gotoCreate("readingPlan");
          }}
        >
          <div className="align-center" style={{ gap: "0.5rem" }}>
            <ReadingPlanIconT />
            <span style={{ fontFamily: `"Satoshi", system-ui, sans-serif` }}>
              {t("readingPlan")}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

return PlaylistTopBar;
