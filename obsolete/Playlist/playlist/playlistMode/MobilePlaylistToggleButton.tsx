const G = globalThis as any;

const MobilePlaylistToggleButton = ({ parentId }: any) => {
  return (
    <p
      style={{
        margin: "0",
        width: "24px",
        backgroundColor: "var(--sidebarShadow)",
        height: "24px",
        border: "none",
      }}
      className="playlist-action small"
      onClick={async () => {
        if (G.IsPlaybarInherited) {
          G.IsASwitchBetweenBar = true;
          await thisBot.setupNowBarControlApp({
            force: true,
            parentId: parentId,
          });
          G.SetIsPlaybarInherited(false);
        }
        setTimeout(() => {
          if (G.makingPlaylist) {
            thisBot.CloseSelf({ force: true });
          } else {
            thisBot.OpenSelf();
          }
        }, 100);
      }}
    >
      <img
        src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/e016a40d7676dad1b52c1906f9bc9cf96b942652cddf3e3448f5cad5ce522d2a.svg"
        class="material-symbols-outlined unfollow img-icon"
        style={{
          margin: "0",
          minWidth: "20px",
        }}
      />
    </p>
  );
};

return MobilePlaylistToggleButton;
