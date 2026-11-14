import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { LoginManager } from "../../managers/LoginManager";

// Shared across every caller so authors of multiple comments (or comments
// re-rendered across chapters) resolve their profile once per session instead
// of once per row. `LoginManager.getUserProfile` has no built-in cache of its
// own for arbitrary user ids (only for the signed-in account), so this mirrors
// the per-id cache already used in `SessionsManager.tsx`.
const annotationAuthorProfileCache = new Map<
  string,
  ReturnType<LoginManager["getUserProfile"]>
>();

/** A comment annotation author's name and picture, resolved from their profile by user id. */
export function useAnnotationAuthorProfile(
  userId: string | null | undefined,
  login: LoginManager
) {
  const name = useSignal("");
  const pictureUrl = useSignal<string | null>(null);
  useEffect(() => {
    if (!userId) {
      return;
    }
    let cancelled = false;
    let promise = annotationAuthorProfileCache.get(userId);
    if (!promise) {
      promise = login.getUserProfile(userId);
      annotationAuthorProfileCache.set(userId, promise);
    }
    promise
      .then((profile) => {
        if (cancelled) {
          return;
        }
        if (profile.name) {
          name.value = profile.name;
        }
        if (profile.pictureUrl) {
          pictureUrl.value = profile.pictureUrl;
        }
      })
      .catch(() => {
        // No profile available; author renders with no name/picture.
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return { name, pictureUrl };
}
