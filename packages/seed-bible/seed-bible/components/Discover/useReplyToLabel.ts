import { useI18n } from "../../i18n/I18nManager";
import type { LoginManager } from "../../managers/LoginManager";
import { useAnnotationAuthorProfile } from "./useAnnotationAuthorProfile";

/**
 * What to call a reply: "Reply to {author}", naming whose note it answers, or
 * just "Reply" when that note is the user's own or its author has no name.
 */
export function useReplyToLabel(
  authorId: string | null | undefined,
  login: LoginManager
): string {
  const { t } = useI18n();
  const { name } = useAnnotationAuthorProfile(authorId, login);
  return name.value.length > 0 && authorId !== login.userId.value
    ? t("reply-title", {
        author: name.value,
        defaultValue: "Reply to {{author}}",
      })
    : t("reply", { defaultValue: "Reply" });
}
