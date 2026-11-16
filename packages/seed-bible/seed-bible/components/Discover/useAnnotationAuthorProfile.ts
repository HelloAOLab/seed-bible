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
    // A caller whose author changes (the composer's "Reply to" title) mustn't
    // keep showing the previous author while the new one loads, or for good
    // when the new one has no name.
    name.value = "";
    pictureUrl.value = null;
    if (!userId) {
      return;
    }
    let cancelled = false;
    let promise = annotationAuthorProfileCache.get(userId);
    if (!promise) {
      const request = login.getUserProfile(userId);
      // A failed read isn't kept, so the next row by this author asks again.
      request.catch(() => {
        if (annotationAuthorProfileCache.get(userId) === request) {
          annotationAuthorProfileCache.delete(userId);
        }
      });
      annotationAuthorProfileCache.set(userId, request);
      promise = request;
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
