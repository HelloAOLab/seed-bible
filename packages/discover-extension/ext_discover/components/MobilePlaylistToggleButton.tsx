import { CloseSelf } from "ext_discover.helper.CloseSelf";
import { openSelf } from "ext_discover.helper.openSelf";
import { setupNowBarControlApp } from "ext_discover.helper.setupNowBarControlApp";

const G = globalThis as Record<string, any>;

export function MobilePlaylistToggleButton({
  parentId = "default",
}: {
  parentId?: string;
}) {
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
          await setupNowBarControlApp({
            force: true,
            parentId,
          });
          G.SetIsPlaybarInherited?.(false);
        }
        setTimeout(() => {
          if (G.makingPlaylist) {
            CloseSelf({ force: true });
          } else {
            void openSelf();
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
        alt=""
      />
    </p>
  );
}
